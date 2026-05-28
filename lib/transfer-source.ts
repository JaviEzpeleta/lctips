import { Interface, id } from "ethers"

export type TransferSourceKind =
  | "profile_tip"
  | "post_tip"
  | "collect"
  | "fundraising"
  | "prediction"
  | "competition"
  | "unknown_post_action"
  | "unknown_account_action"
  | "known_system_transfer"
  | "swap"
  | "bridge"
  | "unknown"

export type TransferSource = {
  kind: TransferSourceKind
  label: string
  confidence: "high" | "medium" | "unknown"
  contractAddress?: string
  contractLabel?: string
  postId?: string
  eventName?: string
  counterpartyAddress?: string
  counterpartyRole?:
    | "account"
    | "post_author"
    | "contributor"
    | "claimer"
    | "sponsor"
    | "user"
    | "winner"
    | "recipient"
    | "creator"
    | "resolver"
    | "voter"
}

type LogLike = {
  address?: string
  topics?: readonly string[]
  data?: string
}

type ClassifyTransferSourceInput = {
  from?: string | null
  to?: string | null
  logs?: readonly LogLike[] | null
}

type KnownAction = {
  address: string
  kind: TransferSourceKind
  label: string
}

type KnownContract = KnownAction & {
  confidence: TransferSource["confidence"]
}

type ActionEvent = {
  action: KnownAction
  counterpartyArg?: string
  counterpartyRole?: TransferSource["counterpartyRole"]
  postIdArg?: string
}

const normalizeAddress = (address?: string | null) =>
  typeof address === "string" ? address.toLowerCase() : null

export const ACTION_HUB_ADDRESS =
  "0xc6d57ee750ef2ee017a9e985a0c4198bed16a802"
export const ACTION_HUB_ADDRESSES = [
  ACTION_HUB_ADDRESS,
  "0x4596724ea4ba9cac81cdcd0d1ca860a3a92248b5",
] as const

export const ORB_ACTIONS = {
  TIP_PROFILE: {
    address: "0x20170f1e53851df4d9ea236a28399493c5b152c0",
    kind: "profile_tip",
    label: "Profile tip",
  },
  TIP_POST: {
    address: "0x4984ec4ffd17e64c8f91691d829bd5aea287e47b",
    kind: "post_tip",
    label: "Post tip",
  },
  COLLECT: {
    address: "0x1cee1cd464c4e44e80acdb0b0e33f88849070f6e",
    kind: "collect",
    label: "Collect",
  },
  FUNDRAISING: {
    address: "0x330fa494660e11a4fbbe54f96add0ec36e02b27e",
    kind: "fundraising",
    label: "Fundraising",
  },
  PREDICTION: {
    address: "0xc610487fb21b7ff8993d2586d8fb24dfd2063d62",
    kind: "prediction",
    label: "Prediction",
  },
  COMPETITION: {
    address: "0x7f9978a0c6854a73d8f1c733aab2af81e2a30b89",
    kind: "competition",
    label: "Competition",
  },
  TIP_NFT: {
    address: "0x3a01f9108848232cc9dbdd01369afc81b6520d50",
    kind: "profile_tip",
    label: "NFT tip",
  },
  TREASURY: {
    address: "0x77151170d5fd8ea64679876cdfa662fd35ef8987",
    kind: "known_system_transfer",
    label: "Treasury",
  },
  DEPOSIT: {
    address: "0xbcd0cff173c1f001e20c9dcd21014366861fa3db",
    kind: "known_system_transfer",
    label: "Deposit",
  },
  MARKETPLACE: {
    address: "0x1c434c8f7312e30fe8ca6f220ef4b3ac987a6814",
    kind: "known_system_transfer",
    label: "Marketplace",
  },
  PAYMASTER: {
    address: "0x6fbcc9b3864dda8e0904206ea2a95aafdac5aab2",
    kind: "known_system_transfer",
    label: "Paymaster",
  },
  ACROSS_BRIDGE: {
    address: "0xb234ca484866c811d0e6d3318866f583781ed045",
    kind: "bridge",
    label: "Across bridge",
  },
  ACROSS_MULTICALL_HANDLER: {
    address: "0xc5939f59b3c9662377dda53a08d5085b2d52b719",
    kind: "bridge",
    label: "Across bridge",
  },
  UNISWAP_ROUTER: {
    address: "0x6ddd32cd941041d8b61df213b9f515a7d288dc13",
    kind: "swap",
    label: "Swap",
  },
  ORB_MULTI_SWAP_ROUTER: {
    address: "0xe98342a54e3a3eb91cf5e3e1f73416bb47fdb093",
    kind: "swap",
    label: "Swap",
  },
} as const satisfies Record<string, KnownAction>

const actionByAddress = new Map<string, KnownAction>(
  [
    ORB_ACTIONS.TIP_PROFILE,
    ORB_ACTIONS.TIP_POST,
    ORB_ACTIONS.COLLECT,
    ORB_ACTIONS.FUNDRAISING,
    ORB_ACTIONS.PREDICTION,
    ORB_ACTIONS.COMPETITION,
    ORB_ACTIONS.TIP_NFT,
  ].map((action) => [action.address, action])
)

const fallbackContractByAddress = new Map<string, KnownContract>(
  [
    ORB_ACTIONS.TREASURY,
    ORB_ACTIONS.DEPOSIT,
    ORB_ACTIONS.MARKETPLACE,
    ORB_ACTIONS.ACROSS_BRIDGE,
    ORB_ACTIONS.ACROSS_MULTICALL_HANDLER,
    ORB_ACTIONS.UNISWAP_ROUTER,
    ORB_ACTIONS.ORB_MULTI_SWAP_ROUTER,
  ].map((contract) => [
    contract.address,
    { ...contract, confidence: contract.kind === "known_system_transfer" ? "medium" : "high" },
  ])
)

const actionHubIface = new Interface([
  "event Lens_ActionHub_AccountAction_Executed(address indexed action, address indexed msgSender, address indexed account, address source, tuple(bytes32 key, bytes value)[] params, bytes returnData)",
  "event Lens_ActionHub_PostAction_Executed(address indexed action, address indexed msgSender, address feed, uint256 indexed postId, address postAuthor, address source, tuple(bytes32 key, bytes value)[] params, bytes returnData)",
])

const ACCOUNT_ACTION_EXECUTED_TOPIC = id(
  "Lens_ActionHub_AccountAction_Executed(address,address,address,address,(bytes32,bytes)[],bytes)"
)
const POST_ACTION_EXECUTED_TOPIC = id(
  "Lens_ActionHub_PostAction_Executed(address,address,address,uint256,address,address,(bytes32,bytes)[],bytes)"
)

const actionEventEntries: Array<[string, ActionEvent]> = [
  [
    id("ContributionMade(address,uint256,uint256)"),
    {
      action: ORB_ACTIONS.FUNDRAISING,
      counterpartyArg: "contributor",
      counterpartyRole: "contributor",
      postIdArg: "postId",
    },
  ],
  [
    id("FundsClaimed(address,uint256,uint256)"),
    {
      action: ORB_ACTIONS.FUNDRAISING,
      counterpartyArg: "claimer",
      counterpartyRole: "claimer",
      postIdArg: "postId",
    },
  ],
  [
    id("FundsRefunded(address,uint256,uint256)"),
    {
      action: ORB_ACTIONS.FUNDRAISING,
      counterpartyArg: "contributor",
      counterpartyRole: "contributor",
      postIdArg: "postId",
    },
  ],
  [
    id("CreatorFeeClaimed(address,address,uint256,uint256)"),
    {
      action: ORB_ACTIONS.PREDICTION,
      counterpartyArg: "creator",
      counterpartyRole: "creator",
      postIdArg: "postId",
    },
  ],
  [
    id("PredictionStaked(address,address,uint256,uint8,uint256,uint256,uint256)"),
    {
      action: ORB_ACTIONS.PREDICTION,
      counterpartyArg: "voter",
      counterpartyRole: "voter",
      postIdArg: "postId",
    },
  ],
  [
    id("RefundClaimedSponsor(address,address,uint256,uint256)"),
    {
      action: ORB_ACTIONS.PREDICTION,
      counterpartyArg: "sponsor",
      counterpartyRole: "sponsor",
      postIdArg: "postId",
    },
  ],
  [
    id("RefundClaimedStake(address,address,uint256,uint8,uint256)"),
    {
      action: ORB_ACTIONS.PREDICTION,
      counterpartyArg: "user",
      counterpartyRole: "user",
      postIdArg: "postId",
    },
  ],
  [
    id("ResolverFeeClaimed(address,address,uint256,uint256)"),
    {
      action: ORB_ACTIONS.PREDICTION,
      counterpartyArg: "resolver",
      counterpartyRole: "resolver",
      postIdArg: "postId",
    },
  ],
  [
    id("SponsorFeeClaimed(address,address,uint256,uint256)"),
    {
      action: ORB_ACTIONS.PREDICTION,
      counterpartyArg: "sponsor",
      counterpartyRole: "sponsor",
      postIdArg: "postId",
    },
  ],
  [
    id("Sponsored(address,address,uint256,uint256)"),
    {
      action: ORB_ACTIONS.PREDICTION,
      counterpartyArg: "sponsor",
      counterpartyRole: "sponsor",
      postIdArg: "postId",
    },
  ],
  [
    id("WinnerClaimed(address,address,uint256,uint8,uint256)"),
    {
      action: ORB_ACTIONS.PREDICTION,
      counterpartyArg: "user",
      counterpartyRole: "user",
      postIdArg: "postId",
    },
  ],
  [
    id("CompetitionConfigured(address,uint256,address,uint72,uint8,uint8,address,uint16,uint256,address)"),
    { action: ORB_ACTIONS.COMPETITION, postIdArg: "postId" },
  ],
  [
    id("PrizeClaimed(address,address,uint256,uint256,uint256)"),
    {
      action: ORB_ACTIONS.COMPETITION,
      counterpartyArg: "winner",
      counterpartyRole: "winner",
      postIdArg: "postId",
    },
  ],
  [
    id("Refunded(address,address,uint256,uint256)"),
    {
      action: ORB_ACTIONS.COMPETITION,
      counterpartyArg: "recipient",
      counterpartyRole: "recipient",
      postIdArg: "postId",
    },
  ],
  [
    id("Sponsored(address,address,uint256,uint256)"),
    {
      action: ORB_ACTIONS.COMPETITION,
      counterpartyArg: "sponsor",
      counterpartyRole: "sponsor",
      postIdArg: "postId",
    },
  ],
  [
    id("Voted(address,address,uint256,uint256)"),
    {
      action: ORB_ACTIONS.COMPETITION,
      counterpartyArg: "voter",
      counterpartyRole: "voter",
      postIdArg: "competitionPostId",
    },
  ],
]

const actionEventsByTopic = new Map<string, ActionEvent[]>()
for (const [topic, event] of actionEventEntries) {
  actionEventsByTopic.set(topic, [
    ...(actionEventsByTopic.get(topic) ?? []),
    event,
  ])
}

const actionEventIface = new Interface([
  "event ContributionMade(address indexed contributor, uint256 indexed postId, uint256 amount)",
  "event FundsClaimed(address indexed claimer, uint256 indexed postId, uint256 amount)",
  "event FundsRefunded(address indexed contributor, uint256 indexed postId, uint256 amount)",
  "event CreatorFeeClaimed(address indexed creator, address indexed feed, uint256 indexed postId, uint256 amount)",
  "event PredictionStaked(address indexed voter, address indexed feed, uint256 indexed postId, uint8 optionIndex, uint256 stakeAmount, uint256 weight, uint256 multiplierWad)",
  "event RefundClaimedSponsor(address indexed sponsor, address indexed feed, uint256 indexed postId, uint256 amount)",
  "event RefundClaimedStake(address indexed user, address indexed feed, uint256 indexed postId, uint8 optionIndex, uint256 amount)",
  "event ResolverFeeClaimed(address indexed resolver, address indexed feed, uint256 indexed postId, uint256 amount)",
  "event SponsorFeeClaimed(address indexed sponsor, address indexed feed, uint256 indexed postId, uint256 amount)",
  "event Sponsored(address indexed sponsor, address indexed feed, uint256 indexed postId, uint256 amount)",
  "event WinnerClaimed(address indexed user, address indexed feed, uint256 indexed postId, uint8 optionIndex, uint256 amount)",
  "event CompetitionConfigured(address indexed feed, uint256 indexed postId, address escrow, uint72 endTimestamp, uint8 numberOfWinners, uint8 splitType, address treasury, uint16 feeBps, uint256 initialPrize, address source)",
  "event PrizeClaimed(address indexed winner, address indexed feed, uint256 indexed postId, uint256 replyPostId, uint256 amount)",
  "event Refunded(address indexed recipient, address indexed feed, uint256 indexed postId, uint256 amount)",
  "event Voted(address indexed voter, address indexed feed, uint256 indexed competitionPostId, uint256 replyPostId)",
])

const SWAP_EVENT_TOPICS = new Set([
  id("Swap(address,address,int256,int256,uint160,uint128,int24)"),
  id("Swap(address,uint256,uint256,uint256,uint256,address)"),
])

const unknownSource = (): TransferSource => ({
  kind: "unknown",
  label: "Unknown",
  confidence: "unknown",
})

const sourceFromAction = (
  action: KnownAction,
  options: {
    postId?: bigint | string | number | null
    eventName?: string
    counterpartyAddress?: string | null
    counterpartyRole?: TransferSource["counterpartyRole"]
  } = {}
): TransferSource => ({
  kind: action.kind,
  label: action.label,
  confidence: "high",
  contractAddress: action.address,
  contractLabel: action.label,
  ...(options.postId !== undefined && options.postId !== null ? { postId: options.postId.toString() } : {}),
  ...(options.eventName ? { eventName: options.eventName } : {}),
  ...(options.counterpartyAddress ? { counterpartyAddress: options.counterpartyAddress } : {}),
  ...(options.counterpartyRole ? { counterpartyRole: options.counterpartyRole } : {}),
})

function getParsedArg(
  parsed: ReturnType<Interface["parseLog"]>,
  name: string
) {
  if (!parsed) return null
  const index = parsed.fragment.inputs.findIndex((input) => input.name === name)
  return index >= 0 ? parsed.args[index] : null
}

function sourceFromActionHubLog(log: LogLike): TransferSource | null {
  const logAddress = normalizeAddress(log.address)
  if (!logAddress || !ACTION_HUB_ADDRESSES.includes(logAddress as typeof ACTION_HUB_ADDRESSES[number])) {
    return null
  }
  const topic = log.topics?.[0]
  if (!topic || !log.data) return null

  if (topic !== ACCOUNT_ACTION_EXECUTED_TOPIC && topic !== POST_ACTION_EXECUTED_TOPIC) {
    return null
  }

  try {
    const parsed = actionHubIface.parseLog({
      topics: [...(log.topics ?? [])],
      data: log.data,
    })
    if (!parsed) return null

    const actionAddress = normalizeAddress(parsed.args.action as string)
    const knownAction = actionAddress ? actionByAddress.get(actionAddress) : null
    if (knownAction) {
      const isPostAction = topic === POST_ACTION_EXECUTED_TOPIC
      return sourceFromAction(
        knownAction,
        {
          postId: isPostAction
            ? (parsed.args.postId as bigint)
            : null,
          counterpartyAddress: isPostAction
            ? (parsed.args.postAuthor as string)
            : (parsed.args.account as string),
          counterpartyRole: isPostAction ? "post_author" : "account",
        }
      )
    }

    const isPostAction = topic === POST_ACTION_EXECUTED_TOPIC
    return {
      kind: isPostAction ? "unknown_post_action" : "unknown_account_action",
      label: isPostAction ? "Unknown post action" : "Unknown account action",
      confidence: "unknown",
      ...(actionAddress ? { contractAddress: actionAddress } : {}),
      ...(isPostAction ? { postId: (parsed.args.postId as bigint).toString() } : {}),
    }
  } catch {
    return null
  }
}

function sourceFromOrbEvent(log: LogLike): TransferSource | null {
  const topic = log.topics?.[0]
  const address = normalizeAddress(log.address)
  if (!topic || !address) return null

  const event = actionEventsByTopic
    .get(topic)
    ?.find((candidate) => candidate.action.address === address)
  if (!event) return null

  try {
    const parsed = actionEventIface.parseLog({
      topics: [...(log.topics ?? [])],
      data: log.data ?? "0x",
    })
    const counterparty = event.counterpartyArg
      ? (getParsedArg(parsed, event.counterpartyArg) as string | null)
      : null
    const postId = event.postIdArg ? getParsedArg(parsed, event.postIdArg) : null

    return sourceFromAction(event.action, {
      postId: postId as bigint | string | number | null,
      eventName: parsed?.name,
      counterpartyAddress: counterparty,
      counterpartyRole: event.counterpartyRole,
    })
  } catch {
    return sourceFromAction(event.action)
  }
}

function sourceFromSwapEvent(input: ClassifyTransferSourceInput): TransferSource | null {
  if (!(input.logs ?? []).some((log) => log.topics?.[0] && SWAP_EVENT_TOPICS.has(log.topics[0]))) {
    return null
  }

  return {
    kind: "swap",
    label: "Swap",
    confidence: "high",
  }
}

function sourceFromKnownContract(input: ClassifyTransferSourceInput): TransferSource | null {
  const candidateAddresses = [
    input.to,
    input.from,
    ...(input.logs ?? []).flatMap((log) => [log.address]),
  ]

  for (const candidate of candidateAddresses) {
    const address = normalizeAddress(candidate)
    if (!address) continue
    const contract = fallbackContractByAddress.get(address)
    if (!contract) continue
    return {
      kind: contract.kind,
      label: contract.label,
      confidence: contract.confidence,
      contractAddress: contract.address,
      contractLabel: contract.label,
    }
  }

  return null
}

export function classifyTransferSource(
  input: ClassifyTransferSourceInput
): TransferSource {
  let actionHubSource: TransferSource | null = null
  for (const log of input.logs ?? []) {
    actionHubSource = sourceFromActionHubLog(log)
    if (actionHubSource) break
  }

  let orbEventSource: TransferSource | null = null
  for (const log of input.logs ?? []) {
    orbEventSource = sourceFromOrbEvent(log)
    if (orbEventSource) break
  }

  if (actionHubSource && orbEventSource) {
    return {
      ...orbEventSource,
      ...actionHubSource,
      eventName: orbEventSource.eventName,
    }
  }
  if (actionHubSource) return actionHubSource
  if (orbEventSource) return orbEventSource

  const swapSource = sourceFromSwapEvent(input)
  if (swapSource) return swapSource

  const knownContractSource = sourceFromKnownContract(input)
  if (knownContractSource) return knownContractSource

  return unknownSource()
}

export function contextualizeTransferSource(
  source: TransferSource,
  direction: "income" | "outcome"
): TransferSource {
  if (source.kind !== "bridge") return source

  return {
    ...source,
    label: direction === "outcome" ? "Bridge out" : "Bridge in",
  }
}

export function resolveDisplayCounterpartyAddress({
  source,
  fallbackAddress,
  profileAddress,
  rawCounterpartyAddress,
}: {
  source: TransferSource
  fallbackAddress: string
  profileAddress: string
  rawCounterpartyAddress?: string | null
}) {
  const rawCounterparty = normalizeAddress(rawCounterpartyAddress)
  if (rawCounterparty === ORB_ACTIONS.TREASURY.address) return fallbackAddress

  const counterparty = source.counterpartyAddress
  if (!counterparty) return fallbackAddress
  if (normalizeAddress(counterparty) === normalizeAddress(profileAddress)) {
    return fallbackAddress
  }

  if (
    source.kind === "known_system_transfer" ||
    source.kind === "swap" ||
    source.kind === "bridge" ||
    source.kind === "unknown"
  ) {
    return fallbackAddress
  }

  return counterparty
}
