import { Interface, id } from "ethers"

export type TransferSourceKind =
  | "profile_tip"
  | "post_tip"
  | "collect"
  | "fundraising"
  | "prediction"
  | "competition"
  | "paid_post"
  | "paid_interaction"
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
  postSlug?: string
  eventName?: string
  counterpartyAddress?: string
  // The party on the *other* side of a two-sided action (e.g. Hey paid
  // interaction): the one who paid to comment/quote/repost. We keep both
  // addresses so the displayed counterparty can be picked per direction —
  // the post author for the payer's outgoing row, the payer for the author's
  // incoming row. See resolveDisplayCounterpartyAddress.
  payerAddress?: string
  counterpartyRole?:
    | "account"
    | "post_author"
    | "contributor"
    | "claimer"
    | "sponsor"
    | "user"
    | "payer"
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
  // Hey's "pay to post" — a PostAction the author attaches to their own post;
  // the flat fee (e.g. 0.03 GHO) is routed entirely to Hey's treasury. Seen via
  // Lens_ActionHub_PostAction_Executed with postAuthor === msgSender.
  PAID_POST: {
    address: "0xaeab214c5e2f44b2dc22fb426238292b128163c2",
    kind: "paid_post",
    label: "Paid post",
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
    ORB_ACTIONS.PAID_POST,
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

// --- Hey "pay per interaction" (InteractionPrepaid) ---
// Hey now charges GHO to comment / quote / repost. The fee splits between the
// *target post's author* (income) and Hey's treasury. It's emitted by a
// fee-splitter contract wrapped inside the payer's Lens-account
// executeTransactions() call — there's no ActionHub or ORB-domain event, so the
// old classifier fell through to "Unknown". We key off the event topic.
//   InteractionPrepaid(source, _key, postId, account, kind, recipient, amount1, amount2, ts)
//   · account   = the payer (the one commenting / quoting / reposting)
//   · postId    = the post being acted on
//   · recipient = that post's author — earns `amount2` when it's > 0
// `kind` (1/2/3) carries a price tier but does NOT cleanly map to
// comment/quote/repost, so we stay at the coarse "paid interaction" bucket.
export const HEY_INTERACTION_SPLITTER =
  "0x9060719480d5a431dd3ce865a1da97822288906e"

const interactionPrepaidIface = new Interface([
  "event InteractionPrepaid(address indexed source, bytes32 indexed key, uint256 indexed postId, address account, uint8 kind, address recipient, uint256 amount1, uint256 amount2, uint256 timestamp)",
])
const INTERACTION_PREPAID_TOPIC = id(
  "InteractionPrepaid(address,bytes32,uint256,address,uint8,address,uint256,uint256,uint256)"
)

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

function sourceFromInteractionPrepaid(log: LogLike): TransferSource | null {
  if (log.topics?.[0] !== INTERACTION_PREPAID_TOPIC) return null

  try {
    const parsed = interactionPrepaidIface.parseLog({
      topics: [...(log.topics ?? [])],
      data: log.data ?? "0x",
    })
    if (!parsed) return null

    const postId = parsed.args.postId as bigint
    // Verified on-chain (n=40): `account` is the interactor who paid to
    // comment/quote/repost; `recipient` is the post author who earns the cut
    // (recipient === post author in every non-self interaction). When someone
    // acts on their *own* post the author-cut routes elsewhere, so the two can
    // coincide or diverge — resolveDisplayCounterpartyAddress handles both.
    const account = parsed.args.account as string
    const recipient = parsed.args.recipient as string

    return {
      kind: "paid_interaction",
      label: "Paid interaction", // contextualized to income/outcome later
      confidence: "high",
      contractAddress: normalizeAddress(log.address) ?? HEY_INTERACTION_SPLITTER,
      contractLabel: "Hey interaction",
      eventName: parsed.name,
      postId: postId.toString(),
      // Default (the payer's outgoing row): the counterparty is the post author.
      counterpartyAddress: recipient,
      counterpartyRole: "post_author",
      // The payer, surfaced as the counterparty on the author's incoming row.
      payerAddress: account,
    }
  } catch {
    return null
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

  let interactionSource: TransferSource | null = null
  for (const log of input.logs ?? []) {
    interactionSource = sourceFromInteractionPrepaid(log)
    if (interactionSource) break
  }
  if (interactionSource) return interactionSource

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
  // Hey paid interaction: you paying to comment/quote/repost vs. earning when
  // someone does it to your post. The meaningful counterparty flips with
  // direction — the post author when you pay, the payer when you earn.
  if (source.kind === "paid_interaction") {
    if (direction === "income") {
      return {
        ...source,
        label: "Interaction income",
        counterpartyAddress: source.payerAddress ?? source.counterpartyAddress,
        counterpartyRole: "payer",
      }
    }
    return { ...source, label: "Paid interaction" }
  }

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
  // Hey paid interaction has two real parties — the payer and the post author.
  // Show whichever one isn't the profile being viewed: the author sees the
  // payer on their income row, the payer sees the author on their outgoing row.
  // If both coincide with the profile (acting on your own post), fall back.
  if (source.kind === "paid_interaction") {
    const profile = normalizeAddress(profileAddress)
    const authorAddr = source.counterpartyAddress
    const payerAddr = source.payerAddress
    if (payerAddr && normalizeAddress(payerAddr) !== profile) return payerAddr
    if (authorAddr && normalizeAddress(authorAddr) !== profile) return authorAddr
    return fallbackAddress
  }

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
