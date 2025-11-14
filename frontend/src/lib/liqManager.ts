import {
  Args,
  bytesToStr,
  formatUnits,
  OperationStatus,
  parseMas,
  parseUnits,
  Provider,
  SmartContract,
} from "@massalabs/massa-web3";
import { toast } from "react-toastify";

export async function getLiqManagerContract(
  connectedAccount: Provider
): Promise<SmartContract> {
  const address = import.meta.env.VITE_LIQ_MANAGER_CONTRACT;

  if (!address) {
    throw new Error("Liq Manager contract address is not defined");
  }

  return new SmartContract(connectedAccount, address);
}

export async function deposit(
  connectedAccount: Provider,
  amountX: string,
  amountY: string,
  xDecimals: number = 9,
  yDecimals: number = 6
): Promise<{ success: boolean; error?: string }> {
  const toastId = toast.loading(
    "Depositing liquidity to the Liq Manager vault..."
  );

  try {
    const contract = await getLiqManagerContract(connectedAccount);
    const args = new Args()
      .addU256(parseUnits(amountX, xDecimals))
      .addU256(parseUnits(amountY, yDecimals));

    const operation = await contract.call("deposit", args, {
      coins: parseMas("0.1"),
    });

    console.log("Deposit transaction sent:", operation.id);

    toast.update(toastId, {
      render: "Waiting for transaction confirmation...",
      isLoading: true,
    });

    const status = await operation.waitSpeculativeExecution();

    if (status === OperationStatus.SpeculativeSuccess) {
      toast.update(toastId, {
        render: "Liquidity deposited successfully!",
        type: "success",
        isLoading: false,
        autoClose: 5000,
      });

      return { success: true };
    } else {
      const events = await operation.getSpeculativeEvents();
      console.log("Deposit failed, events:", events);

      toast.update(toastId, {
        render: "Liquidity deposit failed.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });

      return { success: false, error: "Deposit Transaction failed" };
    }
  } catch (error) {
    console.error("Error depositing liquidity:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    toast.update(toastId, {
      render: `Error: ${errorMessage}`,
      type: "error",
      isLoading: false,
      autoClose: 5000,
    });

    return { success: false, error: errorMessage };
  }
}

export async function fetchSpotPrice(connectedAccount: any): Promise<string> {
  try {
    const contract = await getLiqManagerContract(connectedAccount);

    const result = await contract.read("fetchSpotPrice");
    const spotPriceBytes = result.value;

    if (!spotPriceBytes || spotPriceBytes.length === 0) {
      throw new Error("No spot price data returned from contract");
    }

    // Assuming spot price is returned as u256 in bytes
    const price = new Args(spotPriceBytes).nextU256();

    // Convert to a human-readable string
    return formatUnits(price, 18);
  } catch (error) {
    console.error("Error fetching spot price:", error);
    return "0";
  }
}

export async function getTokenXAddress(connectedAccount: any): Promise<string> {
  const contract = await getLiqManagerContract(connectedAccount);
  const result = await contract.read("getTokenXAddress");
  const tokenXAddressBytes = result.value;
  return bytesToStr(tokenXAddressBytes);
}

export async function getTokenYAddress(connectedAccount: any): Promise<string> {
  const contract = await getLiqManagerContract(connectedAccount);
  const result = await contract.read("getTokenYAddress");
  const tokenYAddressBytes = result.value;
  return bytesToStr(tokenYAddressBytes);
}
