export function getAdaptiveDialCeiling(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;

  const unitExponent = Math.max(0, Math.floor(Math.log(value) / Math.log(1024)));
  const unit = 1024 ** unitExponent;
  const target = value / unit / 0.85;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const normalized = target / magnitude;
  const multiplier =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;

  return Math.max(fallback, multiplier * magnitude * unit);
}

export type CockpitNodeState = "online" | "offline" | "unknown";

export interface CockpitResourceNode {
  online: boolean | null;
  cpuCores: number;
  cpuPct: number;
  ramUsed: number;
  ramTotal: number;
  diskUsed: number;
  diskTotal: number;
}

export interface CockpitResourceSummary {
  cpuCores: number;
  cpuPct: number;
  ramUsed: number;
  ramTotal: number;
  diskUsed: number;
  diskTotal: number;
}

function finiteNonNegative(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function getCockpitResourceSummary(
  nodes: CockpitResourceNode[],
): CockpitResourceSummary {
  let cpuCores = 0;
  let cpuWeight = 0;
  let weightedCpu = 0;
  let ramUsed = 0;
  let ramTotal = 0;
  let diskUsed = 0;
  let diskTotal = 0;

  for (const node of nodes) {
    if (node.online !== true) continue;
    const cores = finiteNonNegative(node.cpuCores);
    const weight = cores || 1;
    cpuCores += cores;
    cpuWeight += weight;
    weightedCpu += Math.min(100, finiteNonNegative(node.cpuPct)) * weight;

    const nodeRamTotal = finiteNonNegative(node.ramTotal);
    if (nodeRamTotal > 0) {
      ramTotal += nodeRamTotal;
      ramUsed += Math.min(nodeRamTotal, finiteNonNegative(node.ramUsed));
    }

    const nodeDiskTotal = finiteNonNegative(node.diskTotal);
    if (nodeDiskTotal > 0) {
      diskTotal += nodeDiskTotal;
      diskUsed += Math.min(nodeDiskTotal, finiteNonNegative(node.diskUsed));
    }
  }

  return {
    cpuCores,
    cpuPct: cpuWeight > 0 ? weightedCpu / cpuWeight : 0,
    ramUsed,
    ramTotal,
    diskUsed,
    diskTotal,
  };
}

export function getCockpitNodeStates(
  totalNodes: number,
  onlineNodes: number,
  offlineNodes: number,
): CockpitNodeState[] {
  const total = Math.max(0, totalNodes);
  if (total === 0) return [];
  const slots = total <= 30 ? total : 36;
  const onlineSlots = total <= 30
    ? Math.min(slots, onlineNodes)
    : Math.min(slots, Math.round((onlineNodes / total) * slots));
  const offlineSlots = total <= 30
    ? Math.min(slots - onlineSlots, offlineNodes)
    : Math.min(slots - onlineSlots, Math.round((offlineNodes / total) * slots));

  return Array.from({ length: slots }, (_, index) => {
    if (index < onlineSlots) return "online";
    if (index >= slots - offlineSlots) return "offline";
    return "unknown";
  });
}
