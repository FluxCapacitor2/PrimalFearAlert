/// <reference types="../CTAutocomplete" />
/// <reference lib="es2015" />

let wasReady = false;

const moduleName = "PrimalFearAlert";

const defaultConfig = {
  x: 8,
  y: 8,
  text: true,
};

let config = readConfig();
let estimatedTime = 0;

const display = new Display({
  renderX: config.x,
  renderY: config.y,
  shouldRender: config.text,
});

const regex = /Primal Fears: ((\d{1,2})m )?(\d{1,2})s/gi;

// This handler runs once per second
register("step", () => {
  let found = false;
  TabList.getNames().forEach((text, index) => {
    const line = ChatLib.removeFormatting(text).trim();
    if (line.includes("Primal Fears:")) {
      found = true;
      const ready = line.includes("READY!!");
      if (ready && !wasReady) {
        wasReady = true;
        playAlert();
      }

      // Parse the line and create an estimated timestamp
      const parsed = regex.exec(line);
      if (parsed !== null && parsed.length === 4) {
        const [_, __, minutes, seconds] = parsed;
        estimatedTime =
          java.lang.System.currentTimeMillis() +
          (minutes ?? 0) * 60 * 1000 +
          seconds * 1000;
      }

      display.setLine(0, text.trim());
      wasReady = ready;
    }
  });
  if (!found) {
    const currentTime = java.lang.System.currentTimeMillis();
    // Use an estimate, if available
    if (estimatedTime > currentTime + 60_000) {
      const diff = Math.round((estimatedTime - currentTime) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      if (minutes > 0) {
        display.setLine(
          0,
          `§cPrimal Fears§7: §6${minutes}m ${seconds}s §7(Estimated)`
        );
      } else {
        display.setLine(0, `§cPrimal Fears§7: §6${seconds}s §7(Estimated)`);
      }
    } else {
      // If no estimate is available, clear the display
      display.setLine(0, "");
    }

    // Play the alert when the Primal Fear is estimated to be ready
    if (estimatedTime && estimatedTime > 0 && estimatedTime < currentTime) {
      if (!wasReady) {
        display.setLine(0, `§c§lPrimal Fears§7: §6§lREADY!! §r§7(Estimated)`);
        wasReady = true;
        playAlert();
      }
    }
  }
}).setFps(1);

register("command", (...args) => {
  const [subcommand, value] = args;
  if (subcommand === "x" || subcommand === "left") {
    config.x = parseInt(value);
    display.renderX = config.x;
  } else if (subcommand === "y" || subcommand === "top") {
    config.y = parseInt(value);
    display.renderY = config.y;
  } else if (subcommand === "overlay" || subcommand === "display") {
    config.text = !config.text;
    display.shouldRender = config.text;
  } else {
    return;
  }
  ChatLib.chat("§a✓ §7Configuration updated!");
  writeConfig();
}).setName("primalfearalert");

// Reset estimate when a Primal Fear is found
register("chat", () => {
  estimatedTime = 0;
})
  .setCriteria("§r§5§lFEAR. §r§eA §r§dPrimal Fear §r§ehas been summoned!§r")
  .setContains();

function playAlert() {
  ChatLib.chat("§6§lPrimal Fear Ready!");
  World.playSound("note.pling", 1.0, 1.0);
  Client.showTitle("§6§lPrimal Fear Ready!", "", 5, 20, 5);
}

function readConfig() {
  const contents = FileLib.read(moduleName, "config.json");
  try {
    return JSON.parse(contents) ?? defaultConfig;
  } catch (e) {
    return defaultConfig;
  }
}

function writeConfig() {
  FileLib.write(moduleName, "config.json", JSON.stringify(config));
}
