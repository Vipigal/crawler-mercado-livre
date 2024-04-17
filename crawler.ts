import puppeteer from "puppeteer";
const fs = require("fs");

function imprimeErro(e: unknown) {
  console.log(e);
}

async function main() {
  const index_product_flag = process.argv.findIndex(
    (arg) => arg === "--product"
  );
  if (index_product_flag === -1) {
    console.error("Error: Please provide --product flag");
    process.exit(1);
  }
  const product = process.argv[index_product_flag + 1];
  if (!product) {
    console.error("Error: Please provide a valid product name");
    process.exit(1);
  }

  try {
    console.log("Lauching browser");
    const browser = await puppeteer.launch({
      executablePath: "/usr/bin/google-chrome",
    });
    console.log("Browser launched!");
    const page = await browser.newPage();

    await page.goto("https://www.mercadolivre.com.br");

    await page.type("#cb1-edit", product);

    const searchResultSelector = ".nav-search-btn";
    await page.waitForSelector(searchResultSelector);

    await page.click(searchResultSelector);

    await page.waitForSelector(".ui-search-layout.ui-search-layout--grid");

    const itemList = await page.$$(".ui-search-layout__item");
    const products: {
      price?: string;
      link?: string | null;
    }[] = [];
    if (itemList) {
      for (const item of itemList) {
        const priceSpan = await item.$(".andes-money-amount__fraction");
        const price = await priceSpan?.evaluate((el) => el.innerHTML);
        const linkDiv = await item.$("a");
        const link = await linkDiv?.evaluate((el) => el.getAttribute("href"));
        products.push({ price, link });
      }

      products.sort((a, b) => {
        if (!a.price || !b.price) return 0;
        return parseFloat(a.price) - parseFloat(b.price);
      });
      const productsText = products
        .map((product) => {
          return `Price: ${product.price}, Link: ${product.link}`;
        })
        .join("\n");

      fs.writeFileSync("produtos.txt", productsText);

      console.log("Products saved to produtos.txt");
    }

    await browser.close();
    process.exit(0);
  } catch (e) {
    imprimeErro(e);
    process.exit(1);
  }
}

main();
