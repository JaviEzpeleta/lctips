import assert from "node:assert/strict"
import test from "node:test"
import { Interface, zeroPadValue } from "ethers"
import {
  ACTION_HUB_ADDRESS,
  ACTION_HUB_ADDRESSES,
  ORB_ACTIONS,
  classifyTransferSource,
  contextualizeTransferSource,
  resolveDisplayCounterpartyAddress,
} from "./transfer-source.ts"

const ACCOUNT = "0x1111111111111111111111111111111111111111"
const FEED = "0x2222222222222222222222222222222222222222"
const AUTHOR = "0x3333333333333333333333333333333333333333"
const SOURCE = "0x4444444444444444444444444444444444444444"
const UNKNOWN_ACTION = "0x5555555555555555555555555555555555555555"

const actionHubIface = new Interface([
  "event Lens_ActionHub_AccountAction_Executed(address indexed action, address indexed msgSender, address indexed account, address source, tuple(bytes32 key, bytes value)[] params, bytes returnData)",
  "event Lens_ActionHub_PostAction_Executed(address indexed action, address indexed msgSender, address feed, uint256 indexed postId, address postAuthor, address source, tuple(bytes32 key, bytes value)[] params, bytes returnData)",
])

const fundraisingIface = new Interface([
  "event ContributionMade(address indexed contributor, uint256 indexed postId, uint256 amount)",
])
const swapIface = new Interface([
  "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)",
])
const transferIface = new Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
])

function actionHubLog(eventName, args) {
  const encoded = actionHubIface.encodeEventLog(
    actionHubIface.getEvent(eventName),
    args
  )
  return {
    address: ACTION_HUB_ADDRESS,
    topics: encoded.topics,
    data: encoded.data,
  }
}

function fundraisingLog() {
  const encoded = fundraisingIface.encodeEventLog(
    fundraisingIface.getEvent("ContributionMade"),
    [ACCOUNT, 123n, 42n]
  )
  return {
    address: ORB_ACTIONS.FUNDRAISING.address,
    topics: encoded.topics,
    data: encoded.data,
  }
}

function swapLog() {
  const encoded = swapIface.encodeEventLog(swapIface.getEvent("Swap"), [
    ACCOUNT,
    AUTHOR,
    1n,
    -1n,
    1n,
    1n,
    1,
  ])
  return {
    address: "0xdf4B8153BF91f54802a9bA16366b2111724384E4",
    topics: encoded.topics,
    data: encoded.data,
  }
}

function transferLog({ from = ACCOUNT, to = AUTHOR, value = 1n } = {}) {
  const encoded = transferIface.encodeEventLog(transferIface.getEvent("Transfer"), [
    from,
    to,
    value,
  ])
  return {
    address: "0x000000000000000000000000000000000000800a",
    topics: encoded.topics,
    data: encoded.data,
  }
}

test("classifies profile tips from ActionHub account action events", () => {
  const source = classifyTransferSource({
    logs: [
      actionHubLog("Lens_ActionHub_AccountAction_Executed", [
        ORB_ACTIONS.TIP_PROFILE.address,
        ACCOUNT,
        AUTHOR,
        SOURCE,
        [],
        "0x",
      ]),
    ],
  })

  assert.equal(source.kind, "profile_tip")
  assert.equal(source.label, "Profile tip")
  assert.equal(source.confidence, "high")
})

test("classifies post tips and preserves the post id", () => {
  const source = classifyTransferSource({
    logs: [
      actionHubLog("Lens_ActionHub_PostAction_Executed", [
        ORB_ACTIONS.TIP_POST.address,
        ACCOUNT,
        FEED,
        987n,
        AUTHOR,
        SOURCE,
        [],
        "0x",
      ]),
    ],
  })

  assert.equal(source.kind, "post_tip")
  assert.equal(source.label, "Post tip")
  assert.equal(source.postId, "987")
})

test("classifies collect and fundraising actions", () => {
  const collect = classifyTransferSource({
    logs: [
      actionHubLog("Lens_ActionHub_PostAction_Executed", [
        ORB_ACTIONS.COLLECT.address,
        ACCOUNT,
        FEED,
        123n,
        AUTHOR,
        SOURCE,
        [],
        "0x",
      ]),
    ],
  })
  const fundraising = classifyTransferSource({ logs: [fundraisingLog()] })

  assert.equal(collect.kind, "collect")
  assert.equal(collect.label, "Collect")
  assert.equal(fundraising.kind, "fundraising")
  assert.equal(fundraising.label, "Fundraising")
})

test("preserves post action authors as preferred action counterparties", () => {
  const source = classifyTransferSource({
    logs: [
      fundraisingLog(),
      actionHubLog("Lens_ActionHub_PostAction_Executed", [
        ORB_ACTIONS.FUNDRAISING.address,
        ACCOUNT,
        FEED,
        123n,
        AUTHOR,
        SOURCE,
        [],
        "0x",
      ]),
    ],
  })

  assert.equal(source.kind, "fundraising")
  assert.equal(source.counterpartyAddress, AUTHOR)
  assert.equal(source.counterpartyRole, "post_author")
  assert.equal(source.eventName, "ContributionMade")
  assert.equal(
    resolveDisplayCounterpartyAddress({
      source,
      fallbackAddress: ORB_ACTIONS.FUNDRAISING.address,
      profileAddress: ACCOUNT,
      rawCounterpartyAddress: ORB_ACTIONS.FUNDRAISING.address,
    }),
    AUTHOR
  )
  assert.equal(
    resolveDisplayCounterpartyAddress({
      source,
      fallbackAddress: ORB_ACTIONS.TREASURY.address,
      profileAddress: ACCOUNT,
      rawCounterpartyAddress: ORB_ACTIONS.TREASURY.address,
    }),
    ORB_ACTIONS.TREASURY.address
  )
})

test("classifies unknown ActionHub action scope explicitly", () => {
  const post = classifyTransferSource({
    logs: [
      actionHubLog("Lens_ActionHub_PostAction_Executed", [
        UNKNOWN_ACTION,
        ACCOUNT,
        FEED,
        123n,
        AUTHOR,
        SOURCE,
        [],
        "0x",
      ]),
    ],
  })
  const account = classifyTransferSource({
    logs: [
      actionHubLog("Lens_ActionHub_AccountAction_Executed", [
        UNKNOWN_ACTION,
        ACCOUNT,
        AUTHOR,
        SOURCE,
        [],
        "0x",
      ]),
    ],
  })

  assert.equal(post.kind, "unknown_post_action")
  assert.equal(post.label, "Unknown post action")
  assert.equal(account.kind, "unknown_account_action")
  assert.equal(account.label, "Unknown account action")
})

test("classifies unknown post actions from alternate ActionHub contracts", () => {
  const source = classifyTransferSource({
    logs: [
      {
        ...actionHubLog("Lens_ActionHub_PostAction_Executed", [
          UNKNOWN_ACTION,
          ACCOUNT,
          FEED,
          456n,
          AUTHOR,
          SOURCE,
          [],
          "0x",
        ]),
        address: ACTION_HUB_ADDRESSES[1],
      },
    ],
  })

  assert.equal(source.kind, "unknown_post_action")
  assert.equal(source.label, "Unknown post action")
  assert.equal(source.contractAddress, UNKNOWN_ACTION.toLowerCase())
  assert.equal(source.postId, "456")
})

test("falls back to known system transfers and unknown", () => {
  const treasuryTransfer = classifyTransferSource({
    to: ORB_ACTIONS.TREASURY.address,
    logs: [],
  })
  const bridgeTransfer = classifyTransferSource({
    to: ORB_ACTIONS.ACROSS_BRIDGE.address,
    logs: [],
  })
  const orbSwapTransfer = classifyTransferSource({
    to: ORB_ACTIONS.ORB_MULTI_SWAP_ROUTER.address,
    logs: [],
  })
  const unknown = classifyTransferSource({
    to: "0x6666666666666666666666666666666666666666",
    logs: [
      {
        address: "0x7777777777777777777777777777777777777777",
        topics: [zeroPadValue("0x01", 32)],
        data: "0x",
      },
    ],
  })

  assert.equal(treasuryTransfer.kind, "known_system_transfer")
  assert.equal(treasuryTransfer.label, "Treasury")
  assert.equal(bridgeTransfer.kind, "bridge")
  assert.equal(bridgeTransfer.label, "Across bridge")
  assert.equal(orbSwapTransfer.kind, "swap")
  assert.equal(orbSwapTransfer.label, "Swap")
  assert.equal(unknown.kind, "unknown")
  assert.equal(unknown.label, "Unknown")
})

test("classifies paymaster-sponsored swap transactions as swaps", () => {
  const source = classifyTransferSource({
    logs: [
      {
        address: ORB_ACTIONS.PAYMASTER.address,
        topics: [zeroPadValue("0x02", 32)],
        data: "0x",
      },
      swapLog(),
    ],
  })

  assert.equal(source.kind, "swap")
  assert.equal(source.label, "Swap")
})

test("does not label paymaster-only gas sponsorship as the transfer source", () => {
  const source = classifyTransferSource({
    from: ACCOUNT,
    to: AUTHOR,
    logs: [
      {
        address: ORB_ACTIONS.PAYMASTER.address,
        topics: [zeroPadValue("0x03", 32)],
        data: "0x",
      },
      transferLog(),
    ],
  })

  assert.equal(source.kind, "unknown")
  assert.equal(source.label, "Unknown")
})

test("labels bridge direction in transfer context", () => {
  const bridgeTransfer = classifyTransferSource({
    to: ORB_ACTIONS.ACROSS_BRIDGE.address,
    logs: [],
  })

  assert.equal(contextualizeTransferSource(bridgeTransfer, "outcome").label, "Bridge out")
  assert.equal(contextualizeTransferSource(bridgeTransfer, "income").label, "Bridge in")
})
