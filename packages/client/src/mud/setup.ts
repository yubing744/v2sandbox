import { setupMUDV2Network } from "@latticexyz/std-client";
import { createFaucetService } from "@latticexyz/network";
import { getNetworkConfig } from "./getNetworkConfig";
import { defineContractComponents } from "./contractComponents";
import { clientComponents } from "./clientComponents";
import { world } from "./world";
import { utils } from "ethers";

export type SetupResult = Awaited<ReturnType<typeof setup>>;

export async function setup() {
  const contractComponents = defineContractComponents(world);
  const networkConfig = await getNetworkConfig();
  const result = await setupMUDV2Network<typeof contractComponents>({
    networkConfig,
    world,
    contractComponents,
    syncThread: "main",
  });

  result.startSync();

  // Request drip from faucet
  const signer = result.network.signer.get();
  if (!networkConfig.devMode && networkConfig.faucetServiceUrl && signer) {
    const address = await signer.getAddress();
    console.info("[Dev Faucet]: Player address -> ", address);

    const faucet = createFaucetService(networkConfig.faucetServiceUrl);

    const requestDrip = async () => {
      const balance = await signer.getBalance();
      console.info(`[Dev Faucet]: Player balance -> ${balance}`);
      const lowBalance = balance?.lte(utils.parseEther("1"));
      if (lowBalance) {
        console.info("[Dev Faucet]: Balance is low, dripping funds to player");
        // Double drip
        await faucet.dripDev({ address });
        await faucet.dripDev({ address });
      }
    };

    requestDrip();
    // Request a drip every 20 seconds
    setInterval(requestDrip, 20000);
  }

  return {
    ...result,
    components: {
      ...result.components,
      ...clientComponents,
    },
  };
}
