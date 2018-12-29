// Note: two level object only, first level should be category, second level can set to text, array or object

module.exports = {
  general: {
    account_name: "Account name",
    account_pubkey: "Account public key",
    account_type: "Account type",
    addr_hash_160: "Address hash 160",
    address: "Address",
    age: "Age",
    agent: "Agent",
    app_info: "Application information",
    back: "Back",
    bits: "Bits",
    block_chain: "Block chain",
    block_hash: "Block hash",
    block_height: "Block height",
    block_rewards: "Block rewards",
    cancel: "Cancel",
    chainwork: "Chainwork",
    client_name: "Client name",
    client_version: "Client version",
    close: "Close",
    coinbase: "Coinbase",
    commitment_hash: "Commitment hash",
    config_updated: "Updated! Please relogin / restart wallet to apply this configuration",
    confirm: "Confirm",
    confirm_balance: "Confirm balance",
    confirmations: "Confirmations",
    connect: "Connect",
    connected: "Connected",
    connected_workers: "Connected workers",
    connecting: "Connecting...",
    continue_without_copy: "Continue without copy",
    copy: "Copy",
    copy_to_clipboard: "Copy to clipboard",
    core_info: "Core information",
    current_height: "Current height",
    custom_server: "Custom server",
    cut: "Cut",
    data_dir: "Data directory",
    date_time: "Date/Time",
    delete: "Delete",
    delete_2: "Del",
    difficulty: "Difficulty",
    downloading_update: "Downloading update",
    exceed_max_size: "Exceed max size",
    fee: "Fee",
    fee_per_kb: "Fee per kilobyte",
    fee_per_kwu: "Fee per weight unit",
    file_saved_to: "File saved to %s",
    fill_this_input_first: "Please fill in this input first",
    final_balance: "Final balance",
    found_new_block: "Found new block",
    fs_library_not_found: "No such library, module or page, file path: %s",
    general: "General",
    hash: "Hash",
    hash_160: "Hash 160",
    height: "Height",
    host: "Host",
    in: "In",
    included_in_block: "Included in block",
    input_scripts: "Input scripts",
    invalid_amount: "Invalid amount",
    invalid_file: "Invalid file",
    invalid_wallet_name: "Invalid wallet name",
    invalid_wmcc_address: "Invalid WMCC address",
    last_active: "Last active",
    last_block_time: "Last block time",
    later: "Later",
    latest_blocks: "Latest blocks",
    latest_txs: "Latest transactions",
    major_update: "Major update",
    manage_address: "Manage address",
    max_inbound: "Max inbound",
    memory_usage: "Memory usage",
    mempool: "Mempool",
    merkle_root: "Merkle root",
    minor_update: "Minor update",
    network: "Network",
    next: "Next",
    next_block: "Next block",
    no_latest_txn_found: "No latest transaction found",
    no_worker_found: "No worker found in user database",
    nonce: "Nonce",
    non_witness_pkh_address: "Non-Witness/Pubkeyhash address",
    not_available: "Not available",
    num_of_coins: "Number of coins",
    num_of_conns: "Number of connections",
    num_of_txs: "Number of transactions",
    ok: "OK",
    operating_system: "Operating System",
    out: "Out",
    output_scripts: "Output scripts",
    outputs: "Outputs",
    overwrite: "Overwrite",
    password: "Password",
    password_dont_match: "Password don't match",
    paste: "Paste",
    patch: "Patch",
    payment_request_na: "Payment request not available for current version",
    port: "Port",
    prev: "Prev",
    previous: "Previous",
    previous_block: "Previous block",
    progress: "Progress",
    public_host: "Public host",
    public_port: "Public port",
    received_time: "Received time",
    recipient_address: "Recipient address",
    redo: "Redo",
    release_date: "Release date",
    remove_worker: "Remove worker",
    required: "Required",
    restart_now: "Restart now",
    scanning_block: "Scanning block",
    show_details: "Show details",
    selectall: "Select all",
    services: "Services",
    size: "Size",
    status: "Status",
    summary: "Summary",
    time: "Time",
    timestamp: "Timestamp",
    tip: "Tip",
    token: "Token",
    too_many_decimal_point: "Too many decimal point",
    total_input: "Total input",
    total_output: "Total output",
    total_received: "Total received",
    transactions: "Transactions",
    transactions_2: "Txns",
    try_again: "Try again",
    tx_fee: "Transaction fee",
    tx_hash: "Transaction hash",
    type: "Type",
    unconfirm_balance: "Unconfirm balance",
    unconfirm_tx: "Unconfirm transaction",
    undo: "Undo",
    update: "Update",
    uptime: "Uptime",
    value: "Value",
    version: "Version",
    view_txs: "View transactions",
    wallet_exists: "Wallet exists",
    wallet_id: "Wallet ID",
    wallet_key: "Wallet key",
    wallet_name: "Wallet name",
    wallet_restored: "Wallet restored",
    watch_only: "Watch only",
    weight: "Weight",
    worker_name: "Worker name",
    your_answer: "Your answer"
  },
  address: {
    no_tx_found_for_addr: "No transaction found for address: %s",
    your_wmcc_addr: {
      title: "Your WMCC Address",
      text_1: "This is Your WMCC Address.",
      text_2: "Share this with anyone so they can send you wmcoins."
    },
    invalid_format: {
      title: "Opps! Invalid address format",
      text_1: "%s is not a valid WMCC Address.",
      text_2: "Please check and try again."
    },
    not_found: {
      title: "Opps! Address not found",
      text: "Cannot find %s in this wallet"
    }
  },
  credential: {
    err_wallet_name_exists: {
      title: "Wallet name exists",
      text_1: "Wallet name %s is already exist",
      text_2: "Click <i>Cancel</i> to rename your new wallet"
    },
    err_wallet_file_exists: [
      "Wallet file exists",
      "Wallet file %s is already exist",
      "Click <i>Cancel</i> to rename your new wallet; or;",
      "If you choose <i>Overwrite</i>, all data in existing file will be lost"
    ],
    err_invalid_credential: [
      "Invalid authentication credentials",
      "Your credentials were not accepted",
      "Please try again"
    ],
    err_invalid_name: [
      "Invalid wallet name",
      "Wallet name can only contain any of the following characters:",
      "Numbers (0-9), Letters (A-Z and a-z), Underscores (_), Hyphens (-),",
      "Single Space ( ), and Periods (.)"
    ]
  },
  message: {
    message_required: "Message is required",
    address_required: "Address is required",
    signature_required: "Signature is required",
    privkey_required: "Private key is required",
    unable_to_sign: "Unable to sign message",
    exceed_maximum_nonce: "Exceed maximum nonce to sign message",
    invalid_signature_len: "Invalid signature length",
    invalid_signature_param: "Invalid signature parameter",
    verification_success: "The signature is valid for the address and message",
    err_addr_msg_otp_required: "Error: Address, Message and OTP are required",
    err_addr_msg_sig_required: "Error: Address, Message and Signature are required",
    err_addr_not_owned_by_wallet: "Error: Address is not owned by this wallet",
    err_verification_failed: "Message verification failed!"
  },
  otp: {
    title: "One Time Password (OTP)",
    click_to_copy: [
      "Click icon below to copy OTP to clipboard",
      "or click Close to continue without copying them"
    ],
    note: "** Please make sure to write down the OTP somewhere",
    new_otp: "Your new OTP: %s",
    err_required: "Error: OTP is required",
    err_invalid: "Error: Invalid OTP, number of tried (%d of %d)"
  },
  transaction: {
    newly_generated_coins: "No Inputs (Newly Generated Coins)",
    output_from_unconfirmed_tx: "Output from unconfirmed transaction",
    unparsed_output_address: "Unparsed output address",
    confirmation: "Transaction confirmation",
    summary: "Transaction summary",
    id: "Transaction ID",
    inputs_count: "Inputs count",
    outputs_count: "Outputs count",
    amount: "Transaction amount",
    fee: "Transaction fee",
    rate: "Transaction rate",
    net_amount: "Net amount",
    sending: "Sending wallet tx (%s): %s",
    sent: "Transaction sent!",
    no_recent_tx_found: "No recent transaction found",
    no_tx_in_mempool: "No transaction in mempool",
    no_tx_in_wallet: "No transactions found in wallet %s for account %s",
    err_could_not_fully_signed: "TX could not be fully signed",
    err_exceeds_policy_sigops: "TX exceeds policy signing operations",
    err_exceeds_policy_weight: "TX exceeds policy weight",
    err_fee_below_min_value: "Fee below minimum value.<br>Minimum: %s wmcc, but got %s wmcc",
    err_payment_req_na: "Request payment via URI will be available <br>on next major update"
  },
  wallet: {
    wallet_exists_want_to_overwrite: "Wallet <a>%s</a> is already exists. Do you want to overwrite it?",
    wallet_exists_warning: "Warning: If you overwrite, all data in the existing wallet will be lost",
    enter_password_if_set: "Enter your password if the password was set:",
    wallet_bak_password: "Wallet .bak password",
    wallet_successfully_restored: "Your wallet %s account successfully restored",
    err_invalid_bak_file: "Invalid wallet backup (.bak) file",
    err_invalid_wallet_name: [
      "Wallet name can only contain any of the following characters:",
      "Numbers (0-9), Letters (A-Z and a-z), Underscores (_), Hyphens (-),",
      "Single Space ( ), and Periods (.)"
    ]
  },
  update: {
    client_up_to_date: "Your client application is up to date",
    update_available: "Update available! WMCC Client %s, you must restart this application to apply new update"
  },
  // Page n module
  module: {
    auth: {
      login: {
        your_answer: "Your Answer",
        select_your_wallet: "Select your wallet",
        date_of_birth: "Date of Birth (DD-MM-YYYY)",
        reset: "Reset",
        get_question: "GET QUESTION"
      },
      create: {
        wallet_name: "Wallet Name",
        date_of_birth: "Date of Birth (DD-MM-YYYY)",
        secret_question: "Secret Question / Hint",
        secret_answer: "Secret Answer / Password",
        add_secret: "+ Add Secret",
        reset: "Reset",
        create: "CREATE"
      }
    },
    menu: {
      auth: {
        login: "LOGIN",
        create_new_wallet: "CREATE NEW WALLET",
        restore_wallet: "RESTORE WALLET"
      },
      top: {
        dashboard: "Dashboard",
        account: "Account",
        wallet: "Wallet",
        send_receive_coin: "Send / Receive Coins",
        explorer: "Explorer",
        exchange: "Exchange"
      },
      side: {
        overview: "Overview",
        sign_message: "Sign Message",
        verify_message: "Verify Message",
        address_book: "Address Book",
        backup_wallet: "Backup Wallet",
        restore_wallet: "Restore Wallet",
        configuration: "Configuration",
        console: "Console",
        information: "Information"
      },
    },
    send_receive: {
      send_coin: {
        send_coin: "Send Coin"
      },
      receive_coin: {
        receive_coin: "Receive Coin"
      }
    },
    overview: {
      miner: {
        miner: "Miner",
        miner_not_running: "MINER IS NOT RUNNING",
        start_mining: "Start Mining",
        stop_mining: "Stop Mining"
      }
    }
  }
}