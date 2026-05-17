---
"@ledgerhq/coin-polkadot": minor
"@ledgerhq/live-common": minor
"@ledgerhq/live-env": minor
---

Add Bittensor (TAO) support to the polkadot coin module: currency config entry, `API_BITTENSOR_SIDECAR` / `API_BITTENSOR_NODE` / `API_BITTENSOR_INDEXER` environment variables, and SS58 prefix 42 handling for address derivation and validation. The currency config is inert until the currency is registered and enabled downstream.
