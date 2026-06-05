type TokenAuthorizerEvent = {
  type: string;
  authorizationToken: string;
  methodArn: string;
};

type AuthorizerResult = {
  principalId: string;
  policyDocument: {
    Version: string;
    Statement: {
      Action: string;
      Effect: "Allow" | "Deny";
      Resource: string;
    }[];
  };
};

export const handler = async (event: TokenAuthorizerEvent): Promise<AuthorizerResult> => {
  const token = event.authorizationToken;

  if (!token) {
    throw new Error("Unauthorized");
  }

  const [scheme, encoded] = token.split(" ");

  if (scheme !== "Basic" || !encoded) {
    throw new Error("Unauthorized");
  }

  const decoded = Buffer.from(encoded, "base64").toString("utf-8");
  const colonIndex = decoded.indexOf(":");

  if (colonIndex === -1) {
    return generatePolicy("user", "Deny", event.methodArn);
  }

  const login = decoded.substring(0, colonIndex);
  const password = decoded.substring(colonIndex + 1);
  const expectedPassword = process.env[login];

  if (expectedPassword && expectedPassword === password) {
    return generatePolicy(login, "Allow", event.methodArn);
  }

  return generatePolicy(login, "Deny", event.methodArn);
};

function generatePolicy(
  principalId: string,
  effect: "Allow" | "Deny",
  resource: string,
): AuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
}
