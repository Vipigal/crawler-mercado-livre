import puppeteer, { Page } from "puppeteer";
const fs = require("fs");

type Products =
  | {
      price: string;
      link: string | null;
      hasDiscount: false;
    }
  | {
      originalPrice: string;
      link: string | null;
      discountPrice: string;
      hasDiscount: true;
    };

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
    const price = await item.$(".ui-search-price__second-line");
    const realPriceSpan = await price?.$(".andes-money-amount__fraction");
    const realPrice =
      (await realPriceSpan?.evaluate((el) => el.innerHTML)) || "";

    const linkDiv = await item.$("a");
    const link =
      (await linkDiv?.evaluate((el) => el.getAttribute("href"))) || "";

    const hasOriginalPrice = await item.$(
      ".andes-money-amount.ui-search-price__original-value"
    );

    if (hasOriginalPrice) {
      const originalPriceSpan = await hasOriginalPrice.$(
        ".andes-money-amount__fraction"
      );
      const originalPrice =
        (await originalPriceSpan?.evaluate((el) => el.innerHTML)) || "";

      products.push({
        link,
        discountPrice: realPrice,
        originalPrice,
        hasDiscount: true,
      });
      continue;
    }

    products.push({ price: realPrice, link, hasDiscount: false });
  }

  console.log(`Successfully scraped products of page ${pageNumber + 1}!`);
}

function getProductPrice(product: Products) {
  return product.hasDiscount
    ? Number(product.discountPrice?.replace(".", "") || 0)
    : Number(product.price.replace(".", ""));
}

function getProductOriginalPrice(product: Products) {
  if (!product.hasDiscount) {
    return 0;
  }
  return Number(product.originalPrice.replace(".", ""));
}

function getDiscountPercentage(price: number, originalPrice: number) {
  return `${((1 - price / originalPrice) * 100).toFixed(0)}%`;
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
      await page.waitForSelector(".ui-search-results");
      await getItemPrices(pageNumber, page, products);
      const nextButton = await page.$(".andes-pagination__button--next");
      if (!nextButton) {
        console.log("No next button found");
        break;
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
      const priceA = getProductPrice(a);
      const priceB = getProductPrice(b);

      return priceA - priceB;
    });
    const productsText = products
      .map((product) => {
        if (!product.link) {
          return;
        }
        const productPrice = new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(getProductPrice(product));

        if (product.hasDiscount) {
          const productOriginalPrice = new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(getProductOriginalPrice(product));

          return `Price (discount - ${getDiscountPercentage(
            getProductPrice(product),
            getProductOriginalPrice(product)
          )}): ${productPrice}, Original Price: ${productOriginalPrice}, Link: ${
            product.link
          }`;
        }

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
