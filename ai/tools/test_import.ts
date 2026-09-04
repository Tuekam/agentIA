import { getPage } from './browser-manager';
console.log("Import success");
async function main() {
  console.log("Opening browser...");
  const page = await getPage("http://localhost:3000");
  console.log("Page opened: ", await page.title());
  process.exit(0);
}
main().catch(e => {
  console.error(e);
  process.exit(1);
});
