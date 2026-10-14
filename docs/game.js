const scenarios = [
  {
    name: "Maya Chen",
    initial: "M",
    purchaseType: "CAR",
    need: 24000,
    budget: 575,
    creditScore: 718,
  },
  {
    name: "Luis Rivera",
    initial: "L",
    purchaseType: "CAR",
    need: 18000,
    budget: 430,
    creditScore: 632,
  },
  {
    name: "Asha Patel",
    initial: "A",
    purchaseType: "HOUSE",
    need: 320000,
    budget: 2400,
    creditScore: 774,
  },
  {
    name: "Noah Kim",
    initial: "N",
    purchaseType: "CAR",
    need: 12000,
    budget: 340,
    creditScore: 681,
  },
  {
    name: "Sofia Alvarez",
    initial: "S",
    purchaseType: "HOUSE",
    need: 280000,
    budget: 2100,
    creditScore: 742,
  },
  {
    name: "Jordan Brooks",
    initial: "J",
    purchaseType: "CAR",
    need: 9000,
    budget: 265,
    creditScore: 604,
  },
];

const loanOptions = {
  principal: Array.from({ length: 144 }, (_, index) =>
    index < 56 ? (index + 5) * 1000 : 60000 + (index - 55) * 5000),
  term: Array.from({ length: 60 }, (_, index) => (index + 1) * 6),
  rate: Array.from({ length: 23 }, (_, index) => index + 2),
};

const creditTiers = [
  { min: 760, label: "VERY GOOD", maxPrincipal: 500000, minRate: 4, maxTerm: 360 },
  { min: 700, label: "GOOD", maxPrincipal: 300000, minRate: 6, maxTerm: 360 },
  { min: 640, label: "FAIR", maxPrincipal: 60000, minRate: 9, maxTerm: 180 },
  { min: 580, label: "LIMITED", maxPrincipal: 30000, minRate: 12, maxTerm: 120 },
  { min: 0, label: "BUILDING", maxPrincipal: 20000, minRate: 15, maxTerm: 96 },
];

const controls = {
  principal: {
    values: [...loanOptions.principal],
    index: 19,
    faceId: "principal-faces",
    outputId: "principal-value",
    format: (value) => `$${value.toLocaleString("en-US")}`,
    summary: (value) => `$${value.toLocaleString("en-US")}`,
  },
  term: {
    values: [...loanOptions.term],
    index: 7,
    faceId: "term-faces",
    outputId: "term-value",
    format: (value) => `${value} mo`,
    summary: (value) => `${value} months`,
  },
  rate: {
    values: [...loanOptions.rate],
    index: 6,
    faceId: "rate-faces",
    outputId: "rate-value",
    format: (value) => `${value}%`,
    summary: (value) => `${value}%`,
  },
};

let scenarioIndex = 0;
let totalScore = 0;
let pendingResult = null;
let toastTimeout;
let activeDrag = null;
const WHEEL_STEP = 60;
const DRAG_STEP = 14;

const byId = (id) => document.getElementById(id);
const currentScenario = () => scenarios[scenarioIndex];
const currentValue = (key) => controls[key].values[controls[key].index];

function applyCreditLimits() {
  const scenario = currentScenario();
  const tier = creditTiers.find((option) => scenario.creditScore >= option.min);
  const eligibleOptions = {
    principal: loanOptions.principal.filter((value) => value <= tier.maxPrincipal),
    term: loanOptions.term.filter((value) => value <= tier.maxTerm),
    rate: loanOptions.rate.filter((value) => value >= tier.minRate),
  };

  Object.entries(eligibleOptions).forEach(([key, values]) => {
    const selected = currentValue(key);
    controls[key].values = values;
    controls[key].index = values.reduce((nearestIndex, value, index) =>
      Math.abs(value - selected) < Math.abs(values[nearestIndex] - selected) ? index : nearestIndex, 0);
  });

  byId("credit-score").textContent = scenario.creditScore;
  byId("credit-tier").textContent = tier.label;
  byId("principal-limit").textContent = `MAX ${formatMoney(tier.maxPrincipal)}`;
    byId("rate-limit").textContent = `APR MIN ${tier.minRate}%`;
    byId("term-limit").textContent = `TERM MAX ${tier.maxTerm} MONTHS`;
  Object.keys(controls).forEach(renderDrum);
}

function formatMoney(value) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function formatScore(value) {
  const formatted = String(Math.abs(value)).padStart(4, "0");
  return value < 0 ? `-${formatted}` : formatted;
}

function renderDrum(key) {
  const control = controls[key];
  const stack = byId(control.faceId);
  stack.replaceChildren();

  for (let offset = -2; offset <= 2; offset += 1) {
    const value = control.values[control.index + offset];
    const face = document.createElement("span");
    face.className = `drum-face${offset === 0 ? " is-center" : ""}`;
    face.style.transform = `rotateX(${-offset * 24}deg) translateZ(var(--drum-radius, 70px))`;
    face.textContent = value === undefined ? "·" : control.format(value);
    stack.append(face);
  }

  byId(control.outputId).textContent = control.summary(currentValue(key));
}

function changeControl(key, amount, drum) {
  const control = controls[key];
  const nextIndex = Math.max(0, Math.min(control.values.length - 1, control.index + amount));
  if (nextIndex === control.index) return;

  control.index = nextIndex;
  drum.dataset.direction = amount > 0 ? "up" : "down";
  drum.classList.remove("is-rolling");
  void drum.offsetWidth;
  drum.classList.add("is-rolling");
  renderDrum(key);
  renderQuote();
}

function paymentFor(principal, annualRate, months) {
  const monthlyRate = annualRate / 1200;
  if (monthlyRate === 0) return principal / months;
  const growth = (1 + monthlyRate) ** months;
  return principal * ((monthlyRate * growth) / (growth - 1));
}

function renderQuote() {
  const principal = currentValue("principal");
  const months = currentValue("term");
  const rate = currentValue("rate");
  const monthly = paymentFor(principal, rate, months);
  const totalInterest = monthly * months - principal;
  const budget = currentScenario().budget;
  const affordable = monthly <= budget;
  const interestLimit = currentScenario().purchaseType === "HOUSE" ? 1.5 : 0.5;
  const amountFit = Math.max(0, 1 - (Math.abs(principal - currentScenario().need) / currentScenario().need) * 1.5);
  const budgetFit = affordable ? 1 : Math.max(0, 1 - (monthly - budget) / budget);
  const interestFit = Math.max(0, 1 - totalInterest / (principal * interestLimit));
  const goodScore = Math.round(350 * amountFit + 200 * budgetFit + 450 * interestFit);
  const badReasons = [];
  if (principal < currentScenario().need) badReasons.push("Doesn't cover the client's requested amount");
  if (principal > currentScenario().need * 1.1) badReasons.push("Borrows more than 10% over the amount needed");
  if (!affordable) badReasons.push("Monthly payment exceeds the client's budget");
  if (totalInterest > principal * interestLimit) badReasons.push(`Total interest exceeds ${interestLimit * 100}% of the amount borrowed`);
  const score = badReasons.length ? -300 * badReasons.length : goodScore;

  byId("monthly-payment").innerHTML = `${formatMoney(monthly)}<span> per month</span>`;
  byId("total-interest").textContent = formatMoney(totalInterest);
  byId("budget-check").textContent = affordable ? "●" : "●";
  byId("budget-result").textContent = affordable
     ? `${formatMoney(budget - monthly)} under budget`
     : `${formatMoney(monthly - budget)} over budget`;
  document.querySelector(".monthly-result").classList.toggle("is-affordable", affordable);

    let feedback = score >= 900 ? "Strong offer." : "Offer fits budget.";
    if (badReasons.length) {
      const risks = [];
      if (principal < currentScenario().need) risks.push("Below need");
      if (principal > currentScenario().need * 1.1) risks.push("Over amount");
      if (!affordable) risks.push("Over budget");
      if (totalInterest > principal * 0.5) risks.push("High interest");
      feedback = `RISK: ${risks.join(" / ")}`;
    }
  byId("offer-feedback").textContent = feedback;
  byId("offer-feedback").classList.toggle("is-warning", badReasons.length > 0);

  return { score, principal, months, rate, monthly, affordable, amountFit, totalInterest, totalPaid: monthly * months, badReasons };
}

function showCostBreakdown(result) {
  const interestShare = result.totalPaid > 0 ? (result.totalInterest / result.totalPaid) * 100 : 0;
  const interestLimit = currentScenario().purchaseType === "HOUSE" ? 1.5 : 0.5;
  const highInterest = result.totalInterest > result.principal * interestLimit;
  byId("cost-score").textContent = `${result.score > 0 ? "+" : ""}${result.score} POINTS`;
  byId("cost-verdict").textContent = highInterest
    ? `INTEREST EXCEEDS ${interestLimit * 100}% OF AMOUNT BORROWED`
    : `INTEREST STAYS BELOW ${interestLimit * 100}% OF AMOUNT BORROWED`;
  byId("cost-verdict").classList.toggle("is-high-interest", highInterest);
  byId("cost-principal").textContent = formatMoney(result.principal);
  byId("cost-term").textContent = `${result.months} months`;
  byId("cost-rate").textContent = `${result.rate}% APR`;
  byId("cost-monthly").textContent = formatMoney(result.monthly);
  byId("cost-interest").textContent = formatMoney(result.totalInterest);
  byId("cost-total").textContent = formatMoney(result.totalPaid);
  byId("cost-principal-share").style.width = `${100 - interestShare}%`;
  byId("cost-interest-share-meter").style.width = `${interestShare}%`;
  byId("cost-interest-share").textContent = `${Math.round(interestShare)}% of every dollar repaid is interest`;
  byId("cost-dialog").classList.toggle("is-high-interest", highInterest);
  byId("cost-dialog").showModal();
}

function renderScenario() {
  const scenario = currentScenario();
  applyCreditLimits();
  byId("client-heading").textContent = scenario.name;
  byId("client-avatar").textContent = scenario.initial;
  byId("need-label").textContent = `${scenario.purchaseType} LOAN NEED`;
  byId("need-amount").textContent = formatMoney(scenario.need);
    byId("budget-amount").textContent = formatMoney(scenario.budget);
    byId("round-label").textContent = `${String(scenarioIndex + 1).padStart(2, "0")} / ${String(scenarios.length).padStart(2, "0")}`;
  document.querySelectorAll(".progress-segment").forEach((segment, index) => {
    segment.classList.toggle("is-active", index <= scenarioIndex);
  });
  renderQuote();
}

function showToast(message) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2100);
}

function finishRun() {
  byId("round-label").textContent = "DONE";
  byId("client-heading").textContent = "Run complete";
  byId("client-avatar").textContent = "✓";
  document.querySelector(".client-details").hidden = true;
  byId("run-result").textContent = `${formatScore(totalScore)} PTS`;
  byId("run-result").hidden = false;
  byId("submit-offer").innerHTML = "<span>START A NEW RUN</span><span class=\"button-arrow\" aria-hidden=\"true\">↻</span>";
  byId("submit-offer").dataset.action = "restart";
  document.querySelectorAll(".drum-control").forEach((drum) => { drum.inert = true; });
  byId("offer-feedback").textContent = "Six people, six chances to make credit work better.";
  byId("offer-feedback").classList.remove("is-warning");
}

function restartRun() {
  scenarioIndex = 0;
  totalScore = 0;
  pendingResult = null;
  byId("score-total").textContent = "0000";
  byId("submit-offer").dataset.action = "submit";
  byId("submit-offer").innerHTML = "<span>MAKE THIS OFFER</span><span class=\"button-arrow\" aria-hidden=\"true\">↗</span>";
  document.querySelectorAll(".drum-control").forEach((drum) => { drum.inert = false; });
    document.querySelector(".client-details").hidden = false;
    byId("run-result").hidden = true;
  controls.principal.values = [...loanOptions.principal];
  controls.principal.index = 19;
  controls.term.values = [...loanOptions.term];
  controls.term.index = 7;
  controls.rate.values = [...loanOptions.rate];
  controls.rate.index = 6;
  renderScenario();
}

document.querySelectorAll(".drum-control").forEach((drum) => {
  const key = drum.dataset.control;
  const drumWindow = drum.querySelector(".drum-window");
  let wheelRemainder = 0;

  drumWindow.addEventListener("wheel", (event) => {
    if (drum.inert || event.ctrlKey) return;
    event.preventDefault();

    wheelRemainder -= event.deltaY * 0.8;
    const steps = Math.round(wheelRemainder / WHEEL_STEP);
    if (steps === 0) return;
    wheelRemainder -= steps * WHEEL_STEP;
    changeControl(key, steps, drum);
  }, { passive: false });

  drumWindow.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    activeDrag = {
      key,
      drum,
      pointerId: event.pointerId,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      distance: 0,
    };
    drum.classList.add("is-dragging");
    drumWindow.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  drumWindow.addEventListener("pointermove", (event) => {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    const delta = activeDrag.lastY - event.clientY;
    const elapsed = Math.max(1, event.timeStamp - activeDrag.lastTime);
    activeDrag.distance += delta;
    activeDrag.lastY = event.clientY;
    activeDrag.lastTime = event.timeStamp;

    const threshold = Math.abs(delta) / elapsed >= 0.9 ? DRAG_STEP : DRAG_STEP + 8;
    const steps = Math.round(activeDrag.distance / threshold);
    if (steps === 0) return;
    activeDrag.distance -= steps * threshold;
    changeControl(activeDrag.key, steps, activeDrag.drum);
  });

  const endDrag = (event) => {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    activeDrag.drum.classList.remove("is-dragging");
    activeDrag = null;
  };

  drumWindow.addEventListener("pointerup", endDrag);
  drumWindow.addEventListener("pointercancel", endDrag);
  drumWindow.addEventListener("lostpointercapture", endDrag);

  drum.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const direction = button.dataset.action === "up" ? 1 : -1;
    changeControl(key, direction, drum);
  });
});

byId("submit-offer").addEventListener("click", (event) => {
  if (event.currentTarget.dataset.action === "restart") {
    restartRun();
    return;
  }

  pendingResult = renderQuote();
  totalScore += pendingResult.score;
  byId("score-total").textContent = formatScore(totalScore);
  showCostBreakdown(pendingResult);
});

byId("cost-dialog").addEventListener("cancel", (event) => event.preventDefault());

byId("cost-continue").addEventListener("click", () => {
  byId("cost-dialog").close();
  if (scenarioIndex === scenarios.length - 1) {
    finishRun();
    showToast(`Run complete: ${totalScore.toLocaleString("en-US")} points`);
    return;
  }

  showToast(pendingResult.badReasons.length
    ? `${pendingResult.score} PTS / ${pendingResult.badReasons.length} RISK`
    : `+${pendingResult.score} PTS`);
  scenarioIndex += 1;
  renderScenario();
});

Object.keys(controls).forEach(renderDrum);
renderScenario();