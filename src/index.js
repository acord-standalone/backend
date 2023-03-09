require('dotenv').config();

const express = require('express');
const app = express();

app.use(express.json());

app.use("/", require("./routes/index.js"));
app.use("/static", express.static(`${process.cwd()}/static`));

app.listen(2023, () => console.log("*:2023"));