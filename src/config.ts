type ENV = "dev" | "test" | "prod";

const env: ENV = "dev";

interface configurationTypes {
  base_url: string;
}

interface keysTypes {
  base_url: string;
}

const configurations: configurationTypes = {
  base_url: "https://app.rebit-japan.com/",
};

export const keys: keysTypes = {
  base_url: configurations?.base_url,
};
