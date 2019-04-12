/* eslint-disable no-console*/

import puppeteer from "puppeteer";
import fs from "fs";
import chalk from "chalk";
import ProgressBar from "progress";

import getStorybook from "./getStorybook";
import PagePool from "./PagePool.js";

const defaultConcurrency = 4;
const defaultSymbolGutter = 100;

export default class Story2sketch {
  constructor({
    output = `${process.cwd()}/dist/stories.asketch.json`,
    url = "http://localhost:9001/iframe.html",
    concurrency = defaultConcurrency,
    pageTitle = "Stories",
    viewports = {
      narrow: {
        width: 320,
        height: 1200,
        symbolPrefix: "📱 "
      },
      standard: {
        width: 1920,
        height: 1200,
        symbolPrefix: "🖥 "
      }
    },
    symbolGutter = defaultSymbolGutter,
    querySelector = "#root",
    verbose = false,
    fixPseudo = false,
    stories,
    storyKindFilter,
    puppeteerOptions = {},
    removePreviewMargin = true
  }) {
    this.output = output;
    this.url = url;
    this.concurrency = concurrency;
    this.pageTitle = pageTitle;
    this.symbolGutter = symbolGutter;
    this.viewports = viewports;
    this.querySelector = querySelector;
    this.stories = stories;
    this.storyKindFilter = storyKindFilter;
    this.verbose = verbose;
    this.fixPseudo = fixPseudo;
    this.removePreviewMargin = removePreviewMargin === true;
    this.puppeteerOptions = puppeteerOptions;

    // Sort viewports by width
    this.sortedViewports = Object.keys(viewports)
      .map(key => ({
        ...viewports[key],
        id: key
      }))
      .sort((a, b) => a.width > b.width);
  }

  reset() {
    this.symbolsByViewport = {};
    this.widestByViewport = {};
    this.tallestByStory = {};
    this.processedStories = 0;
    this.storyCount = 0;
    this.sketchPage = {};
  }

  async init() {
    this.browser = await puppeteer.launch(this.puppeteerOptions);

    if (!this.stories || this.stories === "all") {
      if (this.verbose) {
        console.log(chalk.gray("Detecting stories..."));
      }

      this.stories = await getStorybook(this.browser, this.url);
    }

    if (this.storyKindFilter) {
      let filteredStories = [];

      this.storyKindFilter.forEach((filter) => {
        filteredStories = filteredStories.concat(this.stories.filter((story) => story.kind.match(filter)))
      });
      this.stories = filteredStories;
    }

    console.log(this.stories);

    this.reset();

    this.pagePool = await this.createPagePool();

    this.progressBar = new ProgressBar(
      "[:bar] :percent (:current/:total) :etas remaining",
      {
        total: this.storyCount,
        story: "",
        complete: "#"
      }
    );

    this.sketchPage = await this.getSketchPage();

    console.log(`Processing ${this.storyCount} stories...`);
  }

  // NB The only reason this needs to run in chrome is because html-sketchapp
  // uses imports/exports and therefore won't compile for node. html-sketchapp
  // either needs to compile down, or we can webpack the server bundle.
  async getSketchPage() {
    if (this.verbose) {
      console.log(chalk.gray("Getting sketch page..."));
    }

    const page = await this.browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.goto(this.url, {
      waitUntil: "networkidle2"
    });

    await page.addScriptTag({
      path: `${__dirname}/../browser/page2layers.bundle.js`
    });

    const params = JSON.stringify({
      title: this.pageTitle,
      width: 1920,
      height: 5000
    });

    const sketchPage = await page.evaluate(`
      page2layers
      .getPage(${params})
    `);

    return sketchPage;
  }

  async createPagePool() {
    const pagePool = new PagePool(this.browser, this.concurrency);

    await pagePool.init();

    for (const { kind, stories } of this.stories) {
      for (const story of stories) {
        const storyIndex = this.storyCount;

        this.storyCount++;

        pagePool.queue(async page => {
          const symbolByViewport = await this.getSymbolsForStory({
            page,
            kind,
            story
          });

          let tallest = 0;

          for (const viewportKey in symbolByViewport) {
            const symbol = symbolByViewport[viewportKey];

            tallest = Math.max(tallest, symbol.frame.height);

            this.widestByViewport[viewportKey] = Math.max(
              this.widestByViewport[viewportKey] || 0,
              symbol.frame.width
            );

            // Assign by index to retain the order of the symbols
            this.symbolsByViewport[viewportKey][storyIndex] = symbol;
          }

          this.tallestByStory[storyIndex] = tallest;
        });
      }
    }

    // Initialize an array per viewport based on the number of stories
    for (const { id } of this.sortedViewports) {
      this.symbolsByViewport[id] = Array(this.storyCount);
    }

    return pagePool;
  }

  async getSymbolsForStory({ page, kind, story }) {
    const builtUrl = `${this.url}?selectedKind=${encodeURIComponent(
      kind
    )}&selectedStory=${encodeURIComponent(story.name)}`;

    await page.goto(builtUrl, {
      waitUntil: "networkidle2"
    });

    await page.addScriptTag({
      path: `${__dirname}/../browser/page2layers.bundle.js`
    });

    const name = `${kind}/${story.displayName || story.name}`;
    const symbolByViewport = {};

    for (const { symbolPrefix = "", id, width, height } of this
      .sortedViewports) {
      await page.setViewport({ width, height });

      // Only prefix if symbolPrefix is defined
      const params = JSON.stringify({
        name: `${symbolPrefix}${name}`,
        querySelector: this.querySelector,
        fixPseudo: this.fixPseudo,
        removePreviewMargin: this.removePreviewMargin
      });

      // JSON.parse + JSON.stringify hack was originally used until
      // https://github.com/GoogleChrome/puppeteer/issues/1510 was fixed, but
      // it still results in better performance.


      const symbolJson = await page.evaluate(`
        JSON.stringify(
          page2layers
          .getSymbol(${params})
        );
        `);

      const symbol = JSON.parse(symbolJson);

      if (symbol) {
        symbol.symbolID = `${name}:${id}`;

        symbolByViewport[id] = symbol;
      } else {
        console.warn(
          chalk.yellow(
            ` WARNING: No matching node for "${name}" using querySelector ${
              this.querySelector
            } on viewport ${id}`
          )
        );
      }
    }

    this.logProgress(name);

    return symbolByViewport;
  }

  logProgress(name) {
    this.processedStories += 1;

    if (this.verbose) {
      console.log(
        `${chalk.green("✓")} ${chalk.gray(`Exported`)} ${chalk.bold(`${name}`)}`
      );
    } else {
      this.progressBar.tick({
        processed: this.processedStories,
        story: chalk.bold(name)
      });
    }
  }

  positionSymbols() {
    let xOffset = 0;

    for (const { id } of this.sortedViewports) {
      let yOffset = 0;

      const symbols = this.symbolsByViewport[id];

      for (const [index, symbol] of symbols.entries()) {
        // Skip failed symbols
        if (symbol) {
          symbol.frame.x = xOffset;
          symbol.frame.y = yOffset;
          this.sketchPage.layers.push(symbol);
          yOffset += this.tallestByStory[index] + this.symbolGutter;
        }
      }

      xOffset += this.widestByViewport[id] + this.symbolGutter;
    }
  }

  async execute() {
    process.on("SIGINT", () => {
      this.browser.close();

      this.exited = true;

      process.exit();
    });

    await this.pagePool.execute().catch(error => {
      // Suppress errors if user exited process.
      if (!this.exited) {
        console.error(error);
      }
    });

    this.positionSymbols();

    fs.writeFileSync(this.output, JSON.stringify(this.sketchPage));

    console.log(
      chalk.green(
        `Success! ${
          this.processedStories
        } stories written to ${chalk.white.bold(this.output)}`
      )
    );

    this.browser.close();
    process.exit();
  }
}
