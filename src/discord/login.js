const { Utils: { recursiveImport } } = require("@mostfeatured/dbi");
const dbi = require("./dbi");

(async () => {
  await recursiveImport("./load");
  await dbi.load();
  await dbi.login();
  console.log("Discord bot is ready.")
})();