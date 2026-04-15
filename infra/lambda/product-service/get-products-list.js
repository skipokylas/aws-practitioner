const { products } = require("./products");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

exports.handler = async () => {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(products),
  };
};
