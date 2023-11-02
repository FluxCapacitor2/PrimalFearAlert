/// <reference types="../CTAutocomplete" />
/// <reference lib="es2015" />

let wasReady = false;

const moduleName = "PrimalFearAlert";

const defaultConfig = {
  x: 8,
  y: 8,
  text: true,
  fear: 0,
  estimatedTime: 0,
  sentWelcomeMessage: false,
};

let config = readConfig();
let estimatedTime = config.estimatedTime ?? 0;
let fear = config.fear ?? 0;

if (!config.sentWelcomeMessage) {
  sendHelpMessage();
  config.sentWelcomeMessage = true;
  writeConfig();
}

const display = new Display({
  renderX: config.x,
  renderY: config.y,
  shouldRender: config.text,
});

const countdownRegex = /Primal Fears: ((\d{1,2})m )?(\d{1,2})s/gi;
const fearRegex = /Fear: (\d+)/gi;

// This handler runs once per second
register("step", () => {
  display.shouldRender = isInSkyBlock() && config.text;
  if (!isInSkyBlock()) {
    return;
  }
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
      const parsed = countdownRegex.exec(line);
      if (parsed !== null && parsed.length === 4) {
        const [_, __, minutes, seconds] = parsed;
        estimatedTime =
          java.lang.System.currentTimeMillis() +
          (minutes ?? 0) * 60 * 1000 +
          seconds * 1000;
        config.estimatedTime = estimatedTime;
        writeConfig();
      }

      display.setLine(0, text.trim());
      wasReady = ready;
    }

    if (line.includes("Fear: ")) {
      const result = fearRegex.exec(line);
      if (result && result.length === 2) {
        fear = parseInt(result[1]);
      }
      config.fear = fear;
      writeConfig();
    }
  });
  if (!found) {
    const currentTime = java.lang.System.currentTimeMillis();
    // Use an estimate, if available
    if (estimatedTime > currentTime) {
      const diff = Math.round((estimatedTime - currentTime) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      if (minutes > 0) {
        display.setLine(
          0,
          `§c Primal Fears§7: §6${minutes}m ${seconds}s §7(Estimated)`
        );
      } else {
        display.setLine(0, `§c Primal Fears§7: §6${seconds}s §7(Estimated)`);
      }
    } else {
      // If no estimate is available, clear the display
      display.setLine(0, "§c Primal Fears§7: §6§lREADY!! §7(Estimated)");
    }

    // Play the alert when the Primal Fear is estimated to be ready
    if (estimatedTime && estimatedTime > 0 && estimatedTime < currentTime) {
      if (!wasReady) {
        display.setLine(0, `§c§l Primal Fears§7: §6§lREADY!! §r§7(Estimated)`);
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
    sendHelpMessage();
    return;
  }
  ChatLib.chat("§a✓ §7Configuration updated!");
  writeConfig();
})
  .setTabCompletions((args) => {
    if (args.length === 1) {
      return ["x", "y", "display", "help"];
    }
    return [];
  })
  .setName("primalfearalert");

// Reset estimate when a Primal Fear is found
register("chat", () => {
  if (fear > 0) {
    // Primal Fear cooldown starts at six minutes, minus three seconds for every 1 fear that the player has.
    // https://hypixel.net/threads/october-31-great-spook-event-post-patch-fixes.5528781/
    estimatedTime =
      java.lang.System.currentTimeMillis() + 6 * 60_000 - 3_000 * fear;
  } else {
    estimatedTime = 0;
  }
  config.estimatedTime = estimatedTime;
  writeConfig();
})
  .setCriteria("FEAR. A Primal Fear has been summoned!")
  .setContains();

register("renderOverlay", () => {
  display.setLine(1, "§8 Fear: " + fear);
});

function isInSkyBlock() {
  return Scoreboard.getTitle()?.removeFormatting().includes("SKYBLOCK");
}

function sendHelpMessage() {
  const version = JSON.parse(FileLib.read(moduleName, "metadata.json")).version;
  ChatLib.chat(
    "§c§lPrimalFearAlert §r§7v" + version + "§r§a by FluxCapacitor2"
  );
  ChatLib.chat(
    "§6/primalfearalert x <number> §8- §7Update the overlay's horizontal position"
  );
  ChatLib.chat(
    "§6/primalfearalert y <number> §8- §7Update the overlay's vertical position"
  );
  ChatLib.chat("§6/primalfearalert text §8- §7Toggle the overlay");
}

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
