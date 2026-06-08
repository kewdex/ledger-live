import { deriveAddress, deriveKeypair, generateSeed, sign } from "ripple-keypairs";
import type { XrpSigner } from "@ledgerhq/live-common/families/xrp/types";

/**
 * XRP transaction signing prefix (single-account signing).
 * Prepended to the encoded transaction blob before hashing with SHA-512Half.
 * @see https://xrpl.org/docs/concepts/transactions/#signing-and-submitting-transactions
 */
const TX_SIGN_PREFIX = "53545800";

export type XrpTestSigner = {
  signer: XrpSigner;
  address: string;
  publicKey: string;
  privateKey: string;
  seed: string;
};

/**
 * Builds a deterministic software signer implementing `XrpSigner`.
 * Uses secp256k1 (the XRP default) regardless of the `ed25519` flag.
 *
 * @param seed Optional XRPL family seed (e.g. the genesis "masterpassphrase"
 *             encoded as `snoPBrXtMeMyMHUVTgbuqAfg1SUTb`). When omitted, a
 *             random secp256k1 seed is generated.
 */
export function buildXrpSigner(seed?: string): XrpTestSigner {
  const actualSeed = seed ?? generateSeed({ algorithm: "ecdsa-secp256k1" });
  const { publicKey, privateKey } = deriveKeypair(actualSeed);
  const address = deriveAddress(publicKey);

  const signer: XrpSigner = {
    async getAddress(_path: string, _display?: boolean, _chainCode?: boolean, _ed25519?: boolean) {
      return { publicKey, address };
    },
    async signTransaction(_path: string, rawTxHex: string, _ed25519?: boolean) {
      return sign(TX_SIGN_PREFIX + rawTxHex, privateKey);
    },
  };

  return { signer, address, publicKey, privateKey, seed: actualSeed };
}
