import puppeteer, { Page } from "puppeteer";
const fs = require("fs");

interface Products {
  price?: string;
  link?: string | null;
}

function imprimeErro(e: unknown) {
  console.log(e);
}

async function getItemPrices(
  pageNumber: number,
  page: Page,
  products: Products[]
) {
  const itemList = await page.$$(".ui-search-layout__item");
  if (!itemList) {
    console.log(`No items found on page ${pageNumber}`);
    return;
  }

  for (const item of itemList) {
    const priceSpan = await item.$(".andes-money-amount__fraction");
    const price = (await priceSpan?.evaluate((el) => el.innerHTML)) || "";
    const linkDiv = await item.$("a");
    const link =
      (await linkDiv?.evaluate((el) => el.getAttribute("href"))) || "";
    products.push({ price, link });
  }

  console.log(`Successfully scraped products of page ${pageNumber}!`);
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
  console.log(`Searching for product: ${product}`);

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

    const products: Products[] = [];

    let pageNumber = 0;
    while (true) {
      await page.waitForSelector(".ui-search-layout.ui-search-layout--grid");
      await getItemPrices(pageNumber, page, products);
      const nextButton = await page.$(".andes-pagination__button--next");
      if (!nextButton) {
        console.log("No next button found");
        continue;
      }
      if (
        await nextButton.evaluate((el) =>
          el.classList.contains("andes-pagination__button--disabled")
        )
      ) {
        console.log("No more pages to scrape");
        break;
      }
      await nextButton.click();

      pageNumber++;
    }

    products.sort((a, b) => {
      if (!a.price || !b.price) return 0;
      return (
        Number(a.price.replace(".", "")) - Number(b.price.replace(".", ""))
      );
    });
    const productsText = products
      .map((product) => {
        const productPrice = new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(Number(product.price?.replace(".", "")) || 0);

        return `Price: ${productPrice}, Link: ${product.link}`;
      })
      .join("\n");
    fs.writeFileSync(`produtos-mineirados.txt`, productsText);

    await browser.close();
    process.exit(0);
  } catch (e) {
    imprimeErro(e);
    process.exit(1);
  }
}

main();
