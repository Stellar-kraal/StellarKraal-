# Contract Events

StellarKraal emits Soroban contract events for every state-changing operation. Off-chain systems (backend, indexers) subscribe to these events to stay in sync without polling contract storage.

## Event Format

All events follow the Soroban `env.events().publish(topics, data)` convention:

- **topics** – a tuple of `Symbol` values identifying the event namespace and action.
- **data** – a tuple containing all fields needed for off-chain processing.

## Events

### `collateral_registered`

Emitted by `register_livestock` when a new collateral record is created.

| Field | Topic/Data | Type | Description |
|---|---|---|---|
| `collateral_registered` | topic[0] | `Symbol` | Event discriminator |
| `owner` | topic[1] | `Address` | Owner's Stellar address |
| `collateral_id` | data[0] | `u64` | Assigned collateral ID |
| `animal_type` | data[1] | `Symbol` | Species symbol (e.g. `cattle`) |
| `count` | data[2] | `u32` | Number of animals |
| `appraised_value` | data[3] | `i128` | Oracle-appraised total value |

### `loan / requested`

Emitted by `request_loan` when a new loan is originated.

| Field | Type | Description |
|---|---|---|
| `loan_id` | `u64` | Assigned loan ID |
| `borrower` | `Address` | Borrower's Stellar address |
| `amount` | `i128` | Gross loan amount (before origination fee) |
| `disbursement` | `i128` | Net amount disbursed to borrower |
| `total_collateral_value` | `i128` | Sum of all collateral appraised values |

### `loan_repaid`

Emitted by `repay_loan` after each repayment (partial or full).

| Field | Type | Description |
|---|---|---|
| `loan_id` | `u64` | Loan ID |
| `principal_paid` | `i128` | Amount of principal repaid in this transaction |
| `interest_paid` | `i128` | Amount of interest repaid in this transaction |
| `remaining_balance` | `i128` | Remaining outstanding balance after repayment |

### `loan_liquidated`

Emitted by `liquidate` after a partial or full liquidation.

**Topics:** `[symbol!(loan_liquidated), borrower, liquidator]`

| Position | Value | Type | Description |
|---|---|---|---|
| topics[0] | `loan_liquidated` | `Symbol` | Event identifier |
| topics[1] | `borrower` | `Address` | Borrower's Stellar address |
| topics[2] | `liquidator` | `Address` | Liquidator's Stellar address |

**Data:**

| Field | Type | Description |
|---|---|---|
| `loan_id` | `u64` | Loan ID |
| `repay_amount` | `i128` | Amount repaid by the liquidator |
| `collateral_seized` | `i128` | Proportional collateral value seized (`repay_amount × total_collateral_value / outstanding_before`) |

### `FeeCollect / <loan_id>` (internal)

Emitted when origination or interest fees are transferred to the treasury.

| Field | Type | Description |
|---|---|---|
| `fee_type` | `Symbol` | `originate` or `interest` |
| `amount` | `i128` | Fee amount collected |

### `fee / cfgUpd`

Emitted by `update_fee_config` after a successful fee parameter change.

| Field | Type | Description |
|---|---|---|
| `old_origination_fee_bps` | `u32` | Previous origination fee in basis points |
| `old_interest_fee_bps` | `u32` | Previous interest fee in basis points |
| `new_origination_fee_bps` | `u32` | New origination fee in basis points |
| `new_interest_fee_bps` | `u32` | New interest fee in basis points |

### `Admin / LiqThrUpd` — liquidation threshold updated

Emitted by `set_liquidation_threshold` after a successful threshold update.

**Topics:** `[symbol_short!("Admin"), symbol_short!("LiqThrUpd")]`

**Data:** `(old_threshold, new_threshold)` as `(u32, u32)`.

| Field | Type | Description |
|---|---|---|
| `old_threshold` | `u32` | Previous liquidation threshold in basis points |
| `new_threshold` | `u32` | New liquidation threshold in basis points |

Only the admin can trigger this event (enforced by `assert_admin` before any storage mutation).

### `Pause / activated` — pause activated

Emitted by `pause` when the contract is successfully paused.

**Topics:** `[symbol_short!("Pause"), symbol_short!("activated")]`

**Data:** `(paused_by, pause_expiry_ledger)` as `(Address, u64)`.

| Field | Type | Description |
|---|---|---|
| `paused_by` | `Address` | Admin address that triggered the pause |
| `pause_expiry_ledger` | `u64` | Ledger timestamp at which the pause auto-expires |

### `Pause / lifted` — pause lifted (manual)

Emitted by `unpause` when the contract is manually unpaused by the admin.

**Topics:** `[symbol_short!("Pause"), symbol_short!("lifted")]`

**Data:** `(lifted_by, was_manual)` as `(Address, bool)`.

| Field | Type | Description |
|---|---|---|
| `lifted_by` | `Address` | Admin address that called `unpause` |
| `was_manual` | `bool` | Always `true` for explicit admin unpause; auto-expiry does not emit this event |

> **Note on auto-expiry**: When the pause expires by time (ledger timestamp ≥ `pause_expiry_ledger`), the contract becomes unpaused automatically via the `is_paused_raw` helper without emitting a `pause_lifted` event. The `pause_lifted` event is only emitted on explicit `unpause` calls.

## Naming Convention

Topics follow the pattern `(namespace, action)` using `symbol_short!` macros for
two-part events, or `(event_name, addr1, addr2)` when addresses are embedded in topics
for efficient indexed filtering:

```
(Symbol::new(&env, "collateral_registered"), owner)   // collateral registration
(symbol_short!("loan"),      symbol_short!("requested"))
(Symbol::new(&env, "loan_repaid"), borrower_address)
(symbol_short!("loan"),      symbol_short!("liquidated"))
(symbol_short!("fee"),       symbol_short!("cfgUpd"))
```

## Backend Event Listener

The backend polls the Soroban RPC for new events using `SorobanRpc.Server.getEvents()`. See [`backend/src/contractEventListener.ts`](../../backend/src/contractEventListener.ts).

Configure via environment variables:

| Variable | Default | Description |
|---|---|---|
| `CONTRACT_ID` | — | Deployed contract address (required) |
| `RPC_URL` | `https://soroban-testnet.stellar.org` | Soroban RPC endpoint |
| `EVENT_POLL_INTERVAL_MS` | `5000` | Polling interval in milliseconds |
