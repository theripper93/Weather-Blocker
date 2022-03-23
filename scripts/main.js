class WeatherBlocker {
  constructor() {
    this.maskNeedsUpdate = false;
    this.autoMask = true;
    this.isLevels = game.modules.get("levels")?.active;
    this.mask = new PIXI.LegacyGraphics();
    this.mask.name = WeatherBlocker.moduleName;
    this.requestUpdate = debounce(this.needUpdate, 100);
  }

  static get moduleName() {
    return "weatherblock";
  }

  get drawings() {
    if (this.isLevels && this.token) {
      return canvas.drawings.placeables.filter(
        (d) =>
          this.isWeatherBlocking(d) && _levels.isTokenInRange(this.token, d)
      );
    }
    return canvas.drawings.placeables.filter((d) => this.isWeatherBlocking(d));
  }

  get inverted() {
    return (
      canvas.scene.getFlag(WeatherBlocker.moduleName, "invertMask") ?? false
    );
  }

  get token() {
    if (this.isLevels) {
      return canvas.tokens.controlled[0] ?? _levels.lastReleasedToken;
    } else {
      return canvas.tokens.controlled[0];
    }
  }

  get integration() {
    if (!game.modules.get("betterroofs")?.active) return false;
    return game.settings.get("betterroofs", "wbIntegration");
  }

  setTicker() {
    canvas.app.ticker.add(game.WeatherBlocker.refresh);
  }

  initScene() {
    this.refreshMask();
    this.setMask();
    this.maskNeedsUpdate = true;
  }

  refresh() {
    if (!game.WeatherBlocker.maskNeedsUpdate) return;
    game.WeatherBlocker.maskNeedsUpdate = false;
    setTimeout(() => {
      game.WeatherBlocker.refreshMask();
    }, 100);
  }

  refreshMask() {
    if (!this.mask || this.mask._destroyed) this.setMask();
    this.mask.clear();

    if (!this.inverted)
      this.mask
        .beginFill(0x000000)
        .drawRect(
          0,
          0,
          canvas.scene.dimensions.width,
          canvas.scene.dimensions.height
        );

    const polygons = this.getPolygons();

    for (let p of polygons) {
      if (!this.inverted) {
        this.mask.beginHole().drawPolygon(p).endHole();
      } else {
        this.mask.beginFill(0x000000).drawPolygon(p).endFill();
      }
    }
  }

  getPolygons() {
    const drawings = game.WeatherBlocker.drawings.map(
      (d) => new PIXI.Polygon(this.adjustPolygonPoints(d))
    );
    if (this.inverted || !this.integration) return drawings;
    const rooms = [];
    for (let tile of canvas.foreground.placeables) {
      if (this.roomFilter(tile)) rooms.push(tile.roomPoly);
    }
    return [...drawings, ...rooms];
  }

  roomFilter(tile) {
    if (!tile.roomPoly) return false;
    const token = this.token;
    const center = token
      ? new PIXI.Point(token.data.x + token.w / 2, token.data.y + token.h / 2)
      : new PIXI.Point(0, 0);
    const tokenInTile = token && tile.roomPoly.contains(center.x, center.y);
    if (!tile.occluded && tile.alpha !== 0 && !tokenInTile) return false;
    if (!this.integration) return true;

    const { rangeBottom, rangeTop } = _levels.getFlagsForObject(tile);
    const underRoof =
      rangeTop == Infinity && token && token.data.elevation < rangeBottom;
    return underRoof;
  }

  setMask() {
    this.mask = new PIXI.LegacyGraphics();
    this.mask.name = WeatherBlocker.moduleName;
    canvas.weather.mask = this.mask;
    canvas.weather.children.forEach((c) => {
      if (c.name == WeatherBlocker.moduleName) canvas.weather.removeChild(c);
    });
    canvas.weather.addChild(this.mask);
    if (canvas.fxmaster) {
      canvas.fxmaster.mask = this.mask;
      canvas.fxmaster.children.forEach((c) => {
        if (c.name == WeatherBlocker.moduleName) canvas.fxmaster.removeChild(c);
      });
      canvas.fxmaster.addChild(this.mask);
    }
  }

  setHooks() {
    Hooks.on("canvasInit", () => {
      canvas.weather.mask = null;
    });

    Hooks.on("canvasReady", () => {
      game.WeatherBlocker.initScene();
    });

    Hooks.on("createDrawing", () => {
      game.WeatherBlocker.requestUpdate();
    });

    Hooks.on("updateDrawing", () => {
      game.WeatherBlocker.requestUpdate();
    });

    Hooks.on("deleteDrawing", () => {
      game.WeatherBlocker.requestUpdate();
    });

    Hooks.on("updateScene", (scene, updates) => {
      if (updates.flags && WeatherBlocker.moduleName in updates.flags) {
        game.WeatherBlocker.requestUpdate();
      }
    });

    if (!game.WeatherBlocker.integration) return;

    Hooks.on("createTile", () => {
      game.WeatherBlocker.requestUpdate();
    });

    Hooks.on("updateTile", () => {
      game.WeatherBlocker.requestUpdate();
    });

    Hooks.on("deleteTile", () => {
      game.WeatherBlocker.requestUpdate();
    });

    Hooks.on("updateToken", (token, updates) => {
      if ("elevation" in updates || "x" in updates || "y" in updates) {
        game.WeatherBlocker.requestUpdate();
      }
    });

    Hooks.on("controlToken", () => {
      game.WeatherBlocker.requestUpdate();
    });

    Hooks.on("sightRefresh", () => {
      game.WeatherBlocker.requestUpdate();
    });
  }

  adjustPolygonPoints(drawing) {
    let globalPoints = [];
    if (drawing.data.points.length != 0) {
      drawing.data.points.forEach((p) => {
        globalPoints.push(p[0] + drawing.x, p[1] + drawing.y);
      });
    } else {
      globalPoints = [
        drawing.x,
        drawing.y,
        drawing.x + drawing.width,
        drawing.y,
        drawing.x + drawing.width,
        drawing.y + drawing.height,
        drawing.x,
        drawing.y + drawing.height,
      ];
    }
    return globalPoints;
  }

  needUpdate() {
    this.maskNeedsUpdate = true;
  }

  isWeatherBlocking(drawing) {
    const flag =
      drawing.document.getFlag(WeatherBlocker.moduleName, "blockWeather") ||
      false;
    return flag || drawing.data.text == "blockWeather";
  }
}

Hooks.on("init", () => {
  game.WeatherBlocker = new WeatherBlocker();
  game.WeatherBlocker.setHooks();
});

Hooks.on("ready", () => {
  game.WeatherBlocker.setTicker();
})