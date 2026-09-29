const scenarios = [
  {
    name: "Maya Chen",
    initial: "M",
    need: 24000,
    budget: 575,
    creditScore: 718,
  },
  {
    name: "Luis Rivera",
    initial: "L",
    need: 18000,
    budget: 430,
    creditScore: 632,
  },
  {
    name: "Asha Patel",
    initial: "A",
    need: 30000,
    budget: 690,
    creditScore: 774,
  },
];

const loanOptions = {
  principal: Array.from({ length: 56 }, (_, index) => (index + 5) * 1000),
  term: Array.from({ length: 20 }, (_, index) => (index + 1) * 6),
  rate: Array.from({ length: 23 }, (_, index) => index + 2),
};

const creditTiers = [
  { min: 760, label: "VERY GOOD", maxPrincipal: 60000, minRate: 4, maxTerm: 120 },
  { min: 700, label: "GOOD", maxPrincipal: 48000, minRate: 6, maxTerm: 108 },
  { min: 640, label: "FAIR", maxPrincipal: 32000, minRate: 9, maxTerm: 84 },
  { min: 580, label: "LIMITED", maxPrincipal: 22000, minRate: 12, maxTerm: 60 },
  { min: 0, label: "BUILDING", maxPrincipal: 16000, minRate: 15, maxTerm: 48 },
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
    summary: (value) => `${value} mo`,
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
let toastTimeout;
let activeDrag = null;

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
    byId("term-limit").textContent = `TERM MAX ${tier.maxTerm} MO`;
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
  const amountFit = Math.max(0, 1 - (Math.abs(principal - currentScenario().need) / currentScenario().need) * 1.5);
  const budgetFit = affordable ? 1 : Math.max(0, 1 - (monthly - budget) / budget);
  const interestFit = Math.max(0, 1 - totalInterest / (principal * 0.8));
  const goodScore = Math.round(400 * amountFit + 350 * budgetFit + 250 * interestFit);
  const badReasons = [];
  if (principal < currentScenario().need) badReasons.push("Doesn't cover the client's requested amount");
  if (principal > currentScenario().need * 1.1) badReasons.push("Borrows more than 10% over the amount needed");
  if (!affordable) badReasons.push("Monthly payment exceeds the client's budget");
  if (totalInterest > principal * 0.6) badReasons.push("Total interest exceeds 60% of the amount borrowed");
  const score = badReasons.length ? -300 * badReasons.length : goodScore;

  byId("monthly-payment").innerHTML = `${formatMoney(monthly)}<span>/mo</span>`;
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
      if (totalInterest > principal * 0.6) risks.push("High interest");
      feedback = `RISK: ${risks.join(" / ")}`;
    }
  byId("offer-feedback").textContent = feedback;
  byId("offer-feedback").classList.toggle("is-warning", badReasons.length > 0);

  return { score, monthly, affordable, amountFit, totalInterest, badReasons };
}

function renderScenario() {
  const scenario = currentScenario();
  applyCreditLimits();
  byId("client-heading").textContent = scenario.name;
  byId("client-avatar").textContent = scenario.initial;
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
  byId("offer-feedback").textContent = "Three people, three chances to make credit work better.";
  byId("offer-feedback").classList.remove("is-warning");
}

function restartRun() {
  scenarioIndex = 0;
  totalScore = 0;
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
    wheelRemainder -= event.deltaY;
    const steps = Math.trunc(wheelRemainder / 80);
    if (steps === 0) return;
    wheelRemainder -= steps * 80;
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

    const threshold = Math.abs(delta) / elapsed >= 0.9 ? 8 : 20;
    const steps = Math.trunc(activeDrag.distance / threshold);
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

  const result = renderQuote();
  const scoreChange = result.score;
  totalScore += scoreChange;
  byId("score-total").textContent = formatScore(totalScore);

  if (scenarioIndex === scenarios.length - 1) {
    finishRun();
    showToast(`Run complete: ${totalScore.toLocaleString("en-US")} points`);
    return;
  }

  showToast(result.badReasons.length
    ? `${scoreChange} PTS / ${result.badReasons.length} RISK`
    : `+${scoreChange} PTS`);
  scenarioIndex += 1;
  renderScenario();
});

Object.keys(controls).forEach(renderDrum);
renderScenario();