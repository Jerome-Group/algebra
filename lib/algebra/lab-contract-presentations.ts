import presentations from "./lab-contract-presentations.json" with { type: "json" };
import { labContract, type LabContract } from "./lab-contracts";

type ContractPresentation = Partial<Omit<LabContract, "type">>;
const display: Record<string, ContractPresentation> = presentations;

export function labContractPresentation(id: string): LabContract | undefined {
  const contract = labContract(id);
  return contract && { ...contract, ...display[id] };
}
