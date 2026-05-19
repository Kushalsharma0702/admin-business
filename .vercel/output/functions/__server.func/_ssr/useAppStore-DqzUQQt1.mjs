import { R as React } from "./index.mjs";
const createStoreImpl = (createState) => {
  let state;
  const listeners = /* @__PURE__ */ new Set();
  const setState = (partial, replace) => {
    const nextState = typeof partial === "function" ? partial(state) : partial;
    if (!Object.is(nextState, state)) {
      const previousState = state;
      state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener(state, previousState));
    }
  };
  const getState = () => state;
  const getInitialState = () => initialState;
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const api = { setState, getState, getInitialState, subscribe };
  const initialState = state = createState(setState, getState, api);
  return api;
};
const createStore = ((createState) => createState ? createStoreImpl(createState) : createStoreImpl);
const identity = (arg) => arg;
function useStore(api, selector = identity) {
  const slice = React.useSyncExternalStore(
    api.subscribe,
    React.useCallback(() => selector(api.getState()), [api, selector]),
    React.useCallback(() => selector(api.getInitialState()), [api, selector])
  );
  React.useDebugValue(slice);
  return slice;
}
const createImpl = (createState) => {
  const api = createStore(createState);
  const useBoundStore = (selector) => useStore(api, selector);
  Object.assign(useBoundStore, api);
  return useBoundStore;
};
const create = ((createState) => createState ? createImpl(createState) : createImpl);
function createJSONStorage(getStorage, options) {
  let storage;
  try {
    storage = getStorage();
  } catch (e) {
    return;
  }
  const persistStorage = {
    getItem: (name) => {
      var _a;
      const parse = (str2) => {
        if (str2 === null) {
          return null;
        }
        return JSON.parse(str2, void 0);
      };
      const str = (_a = storage.getItem(name)) != null ? _a : null;
      if (str instanceof Promise) {
        return str.then(parse);
      }
      return parse(str);
    },
    setItem: (name, newValue) => storage.setItem(name, JSON.stringify(newValue, void 0)),
    removeItem: (name) => storage.removeItem(name)
  };
  return persistStorage;
}
const toThenable = (fn) => (input) => {
  try {
    const result = fn(input);
    if (result instanceof Promise) {
      return result;
    }
    return {
      then(onFulfilled) {
        return toThenable(onFulfilled)(result);
      },
      catch(_onRejected) {
        return this;
      }
    };
  } catch (e) {
    return {
      then(_onFulfilled) {
        return this;
      },
      catch(onRejected) {
        return toThenable(onRejected)(e);
      }
    };
  }
};
const persistImpl = (config, baseOptions) => (set, get, api) => {
  let options = {
    storage: createJSONStorage(() => window.localStorage),
    partialize: (state) => state,
    version: 0,
    merge: (persistedState, currentState) => ({
      ...currentState,
      ...persistedState
    }),
    ...baseOptions
  };
  let hasHydrated = false;
  let hydrationVersion = 0;
  const hydrationListeners = /* @__PURE__ */ new Set();
  const finishHydrationListeners = /* @__PURE__ */ new Set();
  let storage = options.storage;
  if (!storage) {
    return config(
      (...args) => {
        console.warn(
          `[zustand persist middleware] Unable to update item '${options.name}', the given storage is currently unavailable.`
        );
        set(...args);
      },
      get,
      api
    );
  }
  const setItem = () => {
    const state = options.partialize({ ...get() });
    return storage.setItem(options.name, {
      state,
      version: options.version
    });
  };
  const savedSetState = api.setState;
  api.setState = (state, replace) => {
    savedSetState(state, replace);
    return setItem();
  };
  const configResult = config(
    (...args) => {
      set(...args);
      return setItem();
    },
    get,
    api
  );
  api.getInitialState = () => configResult;
  let stateFromStorage;
  const hydrate = () => {
    var _a, _b;
    if (!storage) return;
    const currentVersion = ++hydrationVersion;
    hasHydrated = false;
    hydrationListeners.forEach((cb) => {
      var _a2;
      return cb((_a2 = get()) != null ? _a2 : configResult);
    });
    const postRehydrationCallback = ((_b = options.onRehydrateStorage) == null ? void 0 : _b.call(options, (_a = get()) != null ? _a : configResult)) || void 0;
    return toThenable(storage.getItem.bind(storage))(options.name).then((deserializedStorageValue) => {
      if (deserializedStorageValue) {
        if (typeof deserializedStorageValue.version === "number" && deserializedStorageValue.version !== options.version) {
          if (options.migrate) {
            const migration = options.migrate(
              deserializedStorageValue.state,
              deserializedStorageValue.version
            );
            if (migration instanceof Promise) {
              return migration.then((result) => [true, result]);
            }
            return [true, migration];
          }
          console.error(
            `State loaded from storage couldn't be migrated since no migrate function was provided`
          );
        } else {
          return [false, deserializedStorageValue.state];
        }
      }
      return [false, void 0];
    }).then((migrationResult) => {
      var _a2;
      if (currentVersion !== hydrationVersion) {
        return;
      }
      const [migrated, migratedState] = migrationResult;
      stateFromStorage = options.merge(
        migratedState,
        (_a2 = get()) != null ? _a2 : configResult
      );
      set(stateFromStorage, true);
      if (migrated) {
        return setItem();
      }
    }).then(() => {
      if (currentVersion !== hydrationVersion) {
        return;
      }
      postRehydrationCallback == null ? void 0 : postRehydrationCallback(get(), void 0);
      stateFromStorage = get();
      hasHydrated = true;
      finishHydrationListeners.forEach((cb) => cb(stateFromStorage));
    }).catch((e) => {
      if (currentVersion !== hydrationVersion) {
        return;
      }
      postRehydrationCallback == null ? void 0 : postRehydrationCallback(void 0, e);
    });
  };
  api.persist = {
    setOptions: (newOptions) => {
      options = {
        ...options,
        ...newOptions
      };
      if (newOptions.storage) {
        storage = newOptions.storage;
      }
    },
    clearStorage: () => {
      storage == null ? void 0 : storage.removeItem(options.name);
    },
    getOptions: () => options,
    rehydrate: () => hydrate(),
    hasHydrated: () => hasHydrated,
    onHydrate: (cb) => {
      hydrationListeners.add(cb);
      return () => {
        hydrationListeners.delete(cb);
      };
    },
    onFinishHydration: (cb) => {
      finishHydrationListeners.add(cb);
      return () => {
        finishHydrationListeners.delete(cb);
      };
    }
  };
  if (!options.skipHydration) {
    hydrate();
  }
  return stateFromStorage || configResult;
};
const persist = persistImpl;
const seedClients = [
  { id: "rory-williams", name: "Rory Williams", email: "dannielle.stout+Rwilliams@canopytax.com", phone: "(555) 201-3344", type: "Client", ssn: "111-22-2333", dob: "1989-01-05", occupation: "Nurse", clientSince: "2023-12-06", createdOn: "2023-12-06", portalStatus: "active", portalEmail: "dannielle.stout+Rwilliams@canopytax.com", portalInviteSent: "2023-12-06" },
  { id: "maara-c", name: "Maara C.", email: "irie.earnest+maara@canopytax.com", phone: "", type: "Client", ssn: "222-33-4455", dob: "1985-04-12", occupation: "Designer", clientSince: "2023-10-25", createdOn: "2023-10-25", portalStatus: "active", portalEmail: "irie.earnest+maara@canopytax.com", portalInviteSent: "2023-10-25" },
  { id: "loretta-c", name: "Loretta C.", email: "kyle.whittle+5@getcanopy.com", phone: "", type: "Client", ssn: "333-44-5566", dob: "1978-09-22", occupation: "Teacher", clientSince: "2023-10-25", createdOn: "2023-10-25", portalStatus: "active", portalEmail: "kyle.whittle+5@getcanopy.com", portalInviteSent: "2023-10-25" },
  { id: "ricky-cruz", name: "Ricky Cruz", email: "", phone: "", type: "Client", ssn: "444-55-6677", dob: "1990-02-14", occupation: "Driver", clientSince: "2023-10-25", createdOn: "2023-10-25", portalStatus: "none", portalEmail: "", portalInviteSent: "" },
  { id: "alex-sims", name: "Alex Sims", email: "", phone: "", type: "Client", ssn: "555-66-7788", dob: "1992-06-30", occupation: "Engineer", clientSince: "2023-10-25", createdOn: "2023-10-25", portalStatus: "none", portalEmail: "", portalInviteSent: "" },
  { id: "edna-marshall", name: "Edna Marshall", email: "Edna.marshalltest@test.com", phone: "(555) 444-1212", type: "Client", ssn: "666-77-8899", dob: "1965-11-03", occupation: "Retired", clientSince: "2023-08-17", createdOn: "2023-08-17", portalStatus: "active", portalEmail: "Edna.marshalltest@test.com", portalInviteSent: "2023-08-17" },
  { id: "joel-gill", name: "Joel Gill", email: "joelgilltest@test.com", phone: "(555) 333-2211", type: "Client", ssn: "777-88-9900", dob: "1983-07-19", occupation: "Consultant", clientSince: "2023-08-17", createdOn: "2023-08-17", portalStatus: "active", portalEmail: "joelgilltest@test.com", portalInviteSent: "2023-08-17" },
  { id: "patrick-saunders", name: "Patrick Saunders", email: "", phone: "", type: "Client", ssn: "888-99-0011", dob: "1975-03-08", occupation: "Plumber", clientSince: "2023-10-25", createdOn: "2023-10-25", portalStatus: "none", portalEmail: "", portalInviteSent: "" },
  { id: "celia-douglas", name: "Celia Douglas", email: "celiadouglastest@test.com", phone: "(555) 222-9988", type: "Client", ssn: "999-00-1122", dob: "1988-12-25", occupation: "Photographer", clientSince: "2023-08-17", createdOn: "2023-08-17", portalStatus: "active", portalEmail: "celiadouglastest@test.com", portalInviteSent: "2023-08-17" },
  { id: "gary-underwood", name: "Gary Underwood", email: "garyunderwoodtest@test.com", phone: "(555) 111-7766", type: "Client", ssn: "121-21-1212", dob: "1970-05-15", occupation: "Contractor", clientSince: "2023-08-17", createdOn: "2023-08-17", portalStatus: "active", portalEmail: "garyunderwoodtest@test.com", portalInviteSent: "2023-08-17" }
];
const seedTasks = [
  { id: "t1", clientId: "rory-williams", name: "eSign request: f1040.pdf", type: "eSign Request", assignee: "Angela Martin (me)", dueDate: "2024-01-05", status: "With Client", priority: "No priority" },
  { id: "t2", clientId: "rory-williams", name: "Review tax return", type: "Review", assignee: "Angela Martin (me)", dueDate: "2024-01-05", completedDate: "2023-12-06", status: "Completed", priority: "No priority" },
  { id: "t3", clientId: "maara-c", name: "Quarterly bookkeeping review", type: "Review", assignee: "Angela Martin (me)", dueDate: "2026-05-15", status: "In Progress", priority: "Medium" },
  { id: "t4", clientId: "loretta-c", name: "Send 2025 tax organizer", type: "Organizer", assignee: "Angela Martin (me)", dueDate: "2026-05-08", status: "With Client", priority: "High" },
  { id: "t5", clientId: "edna-marshall", name: "Schedule planning call", type: "Other", assignee: "Angela Martin (me)", dueDate: "2026-04-28", status: "In Progress", priority: "Low" },
  { id: "t6", clientId: "joel-gill", name: "1099 review", type: "Review", assignee: "Angela Martin (me)", dueDate: "2026-04-22", status: "Review", priority: "Medium" },
  { id: "t7", clientId: "celia-douglas", name: "Collect prior year W-2", type: "Other", assignee: "Angela Martin (me)", dueDate: "2026-05-01", status: "With Client", priority: "Medium" },
  { id: "t8", clientId: "gary-underwood", name: "Sign engagement letter", type: "eSign Request", assignee: "Angela Martin (me)", dueDate: "2026-05-03", status: "With Client", priority: "High" },
  { id: "t9", clientId: "rory-williams", name: "Prepare Q1 estimates", type: "Other", assignee: "Angela Martin (me)", dueDate: "2026-04-25", completedDate: "2026-04-20", status: "Completed", priority: "Medium" },
  { id: "t10", clientId: "maara-c", name: "File extension", type: "Other", assignee: "Angela Martin (me)", dueDate: "2026-04-15", completedDate: "2026-04-12", status: "Completed", priority: "High" }
];
const supplierList = ["Pete's Dresden", "Dylan's No Frills", "Shell Canada", "Costco Wholesale", "Bell Canada", "Hydro One", "Staples", "Uber", "Amazon", "Tim Hortons", "Loblaws", "Home Depot", "Apple Store", "Air Canada", "Esso"];
const costTotals = [84.2, 142.18, 65.4, 312.75, 198.5, 87.33, 45.99, 22.5, 156.8, 8.95, 234.6, 189, 1299, 485.5, 72.15];
const costTaxes = [10.95, 18.48, 8.5, 40.66, 25.81, 11.35, 5.98, 2.93, 20.38, 1.16, 30.5, 24.57, 168.87, 63.12, 9.38];
const seedCosts = supplierList.map((s, i) => ({
  id: `c${i + 1}`,
  clientId: seedClients[i % seedClients.length].id,
  date: `2026-04-${String(i % 28 + 1).padStart(2, "0")}`,
  supplier: s,
  description: `${s} purchase`,
  total: costTotals[i],
  tax: costTaxes[i],
  category: ["Office", "Travel", "Utilities", "Meals", "Supplies"][i % 5],
  paymentMethod: ["Visa", "AMEX", "Cash", "Bank Transfer"][i % 4],
  status: ["Processing", "To review", "Ready"][i % 3],
  owner: "Angela Martin"
}));
const customerList = ["Acme Corp", "Globex", "Initech", "Umbrella", "Wayne Ent.", "Stark Ind.", "Hooli", "Pied Piper", "Wonka Co", "Soylent"];
const saleTotals = [2500, 1800, 3200, 950, 4100, 1200, 2750, 1650, 3800, 2100];
const saleTaxes = [325, 234, 416, 123.5, 533, 156, 357.5, 214.5, 494, 273];
const seedSales = customerList.map((c, i) => ({
  id: `s${i + 1}`,
  clientId: seedClients[i % seedClients.length].id,
  date: `2026-04-${String(i % 28 + 1).padStart(2, "0")}`,
  customer: c,
  description: `Invoice to ${c}`,
  total: saleTotals[i],
  tax: saleTaxes[i],
  category: ["Consulting", "Tax Prep", "Bookkeeping", "Advisory"][i % 4],
  status: ["Processing", "To review", "Ready"][i % 3]
}));
const txnDescs = ["Pete's Dresden", "Dylan's No Frills", "Shell Canada", "Costco Wholesale", "Bell Canada Bill Pay", "Hydro One Bill Pay", "Staples Office", "Uber Trip", "Amazon Purchase", "Tim Hortons", "Loblaws Groceries", "Home Depot", "Apple Store", "Air Canada Booking", "Esso Fuel", "Client Payment - Acme", "Client Payment - Globex", "Bank Fee", "Interest Earned", "Etransfer Received", "Payroll Deposit", "Rent Payment", "Insurance Premium", "Software Subscription", "Phone Bill", "Internet Bill", "Coffee Shop", "Restaurant", "Parking", "Toll Charge"];
const txnPaidOut = [0, 245.5, 65.4, 312.75, 198.5, 0, 45.99, 22.5, 156.8, 8.95, 0, 189, 299.99, 485.5, 72.15, 0, 320, 15, 0, 125, 0, 1800, 450, 89.99, 75, 0, 4.5, 38.5, 12, 3.5];
const txnPaidIn = [2150, 0, 0, 0, 0, 1800, 0, 0, 0, 0, 2500, 0, 0, 0, 0, 3200, 0, 0, 42.18, 0, 4500, 0, 0, 0, 0, 95, 0, 0, 0, 0];
const seedTransactions = txnDescs.map((d, i) => ({
  id: `tx${i + 1}`,
  clientId: seedClients[i % seedClients.length].id,
  date: `2026-04-${String(i % 28 + 1).padStart(2, "0")}`,
  description: d,
  paidOut: txnPaidOut[i],
  paidIn: txnPaidIn[i],
  currency: "CAD",
  account: "0657 TD Bank",
  matched: i % 3 === 0
}));
const seedCustomers = [
  ...customerList.map((n, i) => ({ id: `cu${i + 1}`, name: n, category: "Sales" })),
  { id: "cu11", name: "Bob's Construction", category: "Contracting" },
  { id: "cu12", name: "Sara's Salon", category: "Beauty" },
  { id: "cu13", name: "QuickPrint Ltd", category: "Printing" },
  { id: "cu14", name: "Maple Cafe", category: "Food" },
  { id: "cu15", name: "Toronto Realty", category: "Real Estate" }
];
const catNames = ["Advertising", "Bank Charges", "Cost of Goods Sold", "Computer & Internet", "Continuing Education", "Contractors", "Depreciation", "Dues & Subscriptions", "Equipment", "Insurance", "Interest Expense", "Legal & Professional", "Meals", "Office Expenses", "Office Supplies", "Postage & Delivery", "Printing", "Rent", "Repairs & Maintenance", "Salaries & Wages", "Software", "Subcontractors", "Supplies", "Taxes & Licenses", "Telephone", "Tools", "Training", "Travel", "Uniforms", "Utilities", "Vehicle Expenses", "Website", "Other Expenses", "Office Furniture", "Marketing", "Hosting", "Office Cleaning", "Charitable Donations", "Bank Fees", "Misc"];
const seedCategories = catNames.map((n, i) => ({ id: `cat${i + 1}`, name: n, code: `${5e3 + i * 10}`, visible: true }));
const seedPaymentMethods = Array.from({ length: 175 }, (_, i) => ({
  id: `pm${i + 1}`,
  name: `Payment Method ${i + 1}`,
  reference: `REF-${String(1e3 + i)}`
}));
["Visa **** 4242", "AMEX **** 1001", "Mastercard **** 8821", "Cash", "Bank Transfer", "PayPal", "Stripe Payout", "Cheque", "Wire Transfer", "Etransfer"].forEach((n, i) => {
  seedPaymentMethods[i].name = n;
  seedPaymentMethods[i].reference = n.replace(/\W+/g, "-");
});
const seedSubmissions = Array.from({ length: 20 }, (_, i) => ({
  id: `sub${i + 1}`,
  status: "Archived",
  itemId: `ITEM-${1e3 + i}`,
  submittedAt: `2026-04-${String(i % 28 + 1).padStart(2, "0")} 10:${String(i % 60).padStart(2, "0")}`,
  submittedBy: "Angela Martin",
  method: ["Email", "Mobile", "Web Upload", "Auto-extract"][i % 4],
  ownedBy: "Angela Martin",
  date: `2026-04-${String(i % 28 + 1).padStart(2, "0")}`
}));
const seedWorkflows = [
  { id: "w1", name: "Auto-categorise meals", trigger: "New cost item", actions: ["Set category=Meals if supplier matches"], enabled: true, lastRun: "2026-04-30" },
  { id: "w2", name: "Notify on large expense", trigger: "Cost > $1000", actions: ["Send email to Angela"], enabled: true, lastRun: "2026-04-29" },
  { id: "w3", name: "Auto-match bank txns", trigger: "Daily 6am", actions: ["Match to costs"], enabled: false, lastRun: "2026-04-28" },
  { id: "w4", name: "Approve vendor payments", trigger: "New supplier", actions: ["Require approval"], enabled: true, lastRun: "2026-04-27" },
  { id: "w5", name: "Weekly summary", trigger: "Monday 9am", actions: ["Send digest email"], enabled: true, lastRun: "2026-04-29" }
];
const seedBankAccounts = [
  { id: "ba1", name: "Operating Account", number: "0657", bank: "TD Bank (Toronto-Dominion B...)", balance: 24532.18, status: "Active" },
  { id: "ba2", name: "Tax Reserve", number: "1199", bank: "RBC", balance: 18250, status: "Active" }
];
const seedBankStatements = [
  { id: "bs1", date: "2026-04-30", description: "April 2026 Statement", openingBalance: 21e3, closingBalance: 24532.18, status: "Reconciled" },
  { id: "bs2", date: "2026-03-31", description: "March 2026 Statement", openingBalance: 19500, closingBalance: 21e3, status: "Reconciled" },
  { id: "bs3", date: "2026-02-28", description: "February 2026 Statement", openingBalance: 17800, closingBalance: 19500, status: "Pending" }
];
const seedMessages = [
  { id: "m1", clientId: "rory-williams", from: "Angela Martin", to: "Rory Williams", channel: "Email", body: "Hi Rory, your tax return is ready for review. Please check the portal.", sentAt: "2023-12-04 10:30" },
  { id: "m2", clientId: "rory-williams", from: "Rory Williams", to: "Angela Martin", channel: "Email", body: "Thanks Angela! I'll review it tonight and send it back.", sentAt: "2023-12-04 18:12" },
  { id: "m3", clientId: "rory-williams", from: "Angela Martin", to: "Rory Williams", channel: "Portal", body: "Reminder: please eSign the f1040.pdf when you have a moment.", sentAt: "2023-12-08 09:00" }
];
const seedBilling = seedClients.flatMap((c, i) => [
  { id: `b${i}a`, clientId: c.id, invoiceNumber: `INV-${1e3 + i * 2}`, date: "2026-03-15", description: "Tax preparation services", amount: 450 + i * 25, status: "Paid" },
  { id: `b${i}b`, clientId: c.id, invoiceNumber: `INV-${1001 + i * 2}`, date: "2026-04-15", description: "Quarterly bookkeeping", amount: 300 + i * 15, status: i % 3 === 0 ? "Unpaid" : "Paid" }
]);
const seedTimeEntries = seedClients.flatMap((c, i) => [
  { id: `te${i}a`, clientId: c.id, date: "2026-04-10", description: "Tax return prep", hours: 2.5, rate: 150, loggedBy: "Angela Martin" },
  { id: `te${i}b`, clientId: c.id, date: "2026-04-18", description: "Client call & follow-up", hours: 1, rate: 150, loggedBy: "Angela Martin" }
]);
const seedFiles = [];
const seedNotes = [];
const seedResolutionCases = [];
const seedOrganizers = [];
const seedTranscripts = [];
const seedActivity = [
  { id: "a1", type: "task_completed", title: "Review tax return", subtitle: "Rory Williams", clientId: "rory-williams", timestamp: "2 hours ago" },
  { id: "a2", type: "doc_captured", title: "Pete's Dresden — $84.20", subtitle: "Cost item added", clientId: "rory-williams", timestamp: "3 hours ago" },
  { id: "a3", type: "client_added", title: "Gary Underwood added as client", subtitle: "by Angela Martin", clientId: "gary-underwood", timestamp: "5 hours ago" },
  { id: "a4", type: "txn_matched", title: "Costco Wholesale matched", subtitle: "Bank transaction linked", clientId: "maara-c", timestamp: "Yesterday" },
  { id: "a5", type: "task_completed", title: "File extension", subtitle: "Maara C.", clientId: "maara-c", timestamp: "Yesterday" },
  { id: "a6", type: "doc_captured", title: "Bell Canada — $142.18", subtitle: "Cost item added", clientId: "loretta-c", timestamp: "Yesterday" },
  { id: "a7", type: "client_added", title: "Celia Douglas added as client", subtitle: "by Angela Martin", clientId: "celia-douglas", timestamp: "2 days ago" },
  { id: "a8", type: "txn_matched", title: "Acme Corp payment matched", subtitle: "Sale linked", clientId: "edna-marshall", timestamp: "2 days ago" },
  { id: "a9", type: "task_completed", title: "Prepare Q1 estimates", subtitle: "Rory Williams", clientId: "rory-williams", timestamp: "3 days ago" },
  { id: "a10", type: "doc_captured", title: "Hydro One — $98.40", subtitle: "Cost item added", clientId: "joel-gill", timestamp: "3 days ago" }
];
const useAppStore = create()(persist((set) => ({
  clients: seedClients,
  tasks: seedTasks,
  costs: seedCosts,
  sales: seedSales,
  transactions: seedTransactions,
  customers: seedCustomers,
  categories: seedCategories,
  paymentMethods: seedPaymentMethods,
  submissions: seedSubmissions,
  workflows: seedWorkflows,
  bankAccounts: seedBankAccounts,
  bankStatements: seedBankStatements,
  messages: seedMessages,
  billing: seedBilling,
  timeEntries: seedTimeEntries,
  activity: seedActivity,
  resolutionCases: seedResolutionCases,
  organizers: seedOrganizers,
  transcripts: seedTranscripts,
  files: seedFiles,
  notes: seedNotes,
  receipts: [],
  extractionSettings: { emailPrefix: "angela-martin", showInboxTabs: true, duplicateMode: "Automatic", extractTax: true, defaultTaxRate: 13 },
  automationSettings: { autoCategorisation: "Always", defaultCategory: "Office Expenses", smartSuggestions: true, autoApply: false, groupUncategorised: false },
  exportSettings: { csvFormat: "Standard", decimalSeparator: "Dot", dateFormat: "DD-Mon-YYYY", showItemHeader: true, columns: { "Receipt ID": true, "Description": true, "Net amount": true, "Tax amount": true, "Total amount": true, "Supplier": false, "Date": false, "Category": false, "Payment method": false } },
  businessProfile: { name: "Martin & Co. Tax Advisors", crn: "1234567", country: "Canada", currency: "CAD", language: "English", industry: "Accounting", selfEmployed: false, yearEndMonth: "December", yearEndDay: "31", taxNumber: "TX-998877", reportingCycle: "Quarterly" },
  addTask: (t) => set((s) => ({ tasks: [t, ...s.tasks] })),
  updateTask: (id, patch) => set((s) => ({ tasks: s.tasks.map((x) => x.id === id ? { ...x, ...patch } : x) })),
  completeTask: (id) => set((s) => ({ tasks: s.tasks.map((x) => x.id === id ? { ...x, status: "Completed", completedDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) } : x) })),
  addNote: (n) => set((s) => ({ notes: [n, ...s.notes] })),
  addFile: (f) => set((s) => ({ files: [f, ...s.files] })),
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  addCost: (c) => set((s) => ({ costs: [c, ...s.costs] })),
  updateCost: (id, patch) => set((s) => ({ costs: s.costs.map((x) => x.id === id ? { ...x, ...patch } : x) })),
  deleteCosts: (ids) => set((s) => ({ costs: s.costs.filter((x) => !ids.includes(x.id)) })),
  addSale: (sa) => set((s) => ({ sales: [sa, ...s.sales] })),
  addCustomer: (c) => set((s) => ({ customers: [c, ...s.customers] })),
  toggleTransactionMatch: (id) => set((s) => ({ transactions: s.transactions.map((x) => x.id === id ? { ...x, matched: !x.matched } : x) })),
  toggleCategoryVisible: (id) => set((s) => ({ categories: s.categories.map((x) => x.id === id ? { ...x, visible: !x.visible } : x) })),
  addCategory: (c) => set((s) => ({ categories: [...s.categories, c] })),
  toggleWorkflow: (id) => set((s) => ({ workflows: s.workflows.map((x) => x.id === id ? { ...x, enabled: !x.enabled } : x) })),
  addInvoice: (b) => set((s) => ({ billing: [b, ...s.billing] })),
  addTimeEntry: (t) => set((s) => ({ timeEntries: [t, ...s.timeEntries] })),
  addResolutionCase: (r) => set((s) => ({ resolutionCases: [r, ...s.resolutionCases] })),
  addOrganizer: (o) => set((s) => ({ organizers: [o, ...s.organizers] })),
  addTranscript: (t) => set((s) => ({ transcripts: [t, ...s.transcripts] })),
  updateClient: (id, patch) => set((s) => ({ clients: s.clients.map((x) => x.id === id ? { ...x, ...patch } : x) })),
  updateExtraction: (patch) => set((s) => ({ extractionSettings: { ...s.extractionSettings, ...patch } })),
  updateAutomation: (patch) => set((s) => ({ automationSettings: { ...s.automationSettings, ...patch } })),
  updateExport: (patch) => set((s) => ({ exportSettings: { ...s.exportSettings, ...patch } })),
  updateBusiness: (patch) => set((s) => ({ businessProfile: { ...s.businessProfile, ...patch } })),
  addReceipt: (r) => set((s) => ({ receipts: [r, ...s.receipts] })),
  updateReceipt: (id, patch) => set((s) => ({ receipts: s.receipts.map((x) => x.id === id ? { ...x, ...patch } : x) }))
}), {
  name: "taxease-admin-store",
  partialize: (s) => ({
    costs: s.costs,
    files: s.files,
    receipts: s.receipts
  })
}));
const uid = () => Math.random().toString(36).slice(2, 10);
export {
  useAppStore as a,
  uid as u
};
