const { products } = require("./products");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  const productId = event?.pathParameters?.productId;

  if (!productId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: "Missing productId in request path" }),
    };
  }

  const product = products.find((item) => item.id === productId);

  if (!product) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: `Product with id "${productId}" not found` }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(product),
  };
};
