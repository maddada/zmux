/** CDXC:AgentProviders 2026-09-07 DECISION: Hide emails keeps only the first and last characters of the address before @ and fully obscures the domain, including email-shaped account names. */
export function maskAccountText(text: string): string {
  return text.replace(/([^\s@]+)@[^\s@]+/gu, (_, address: string) => {
    const characters = Array.from(address);
    return `${characters[0]}•••${characters.length > 1 ? characters.at(-1) : ''}@••••••.•••`;
  });
}
