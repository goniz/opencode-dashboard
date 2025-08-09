export type ModelIdentifier = {
  providerID: string;
  modelID: string;
};

export function parseModelIdentifier(modelString: string): ModelIdentifier {
  const slashIndex = modelString.indexOf('/');
  if (slashIndex === -1) {
    // Handle cases where there is no slash, though this shouldn't happen with valid model strings.
    // Depending on desired error handling, you could throw an error or return a default/empty object.
    // For now, let's assume the whole string is the modelID and provider is unknown.
    return { providerID: 'unknown', modelID: modelString };
  }
  const providerID = modelString.substring(0, slashIndex);
  const modelID = modelString.substring(slashIndex + 1);
  return { providerID, modelID };
}
