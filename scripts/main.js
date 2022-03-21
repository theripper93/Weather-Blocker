class WeatherBlocker {
  constructor(){
    this.maskNeedsUpdate = false;
    this.autoMask = true;
    this.isLevels = game.modules.get("levels")?.active;
    this.mask = new PIXI.LegacyGraphics();
    this.mask.name = WeatherBlocker.moduleName;
  }

  static get moduleName(){
    return "weatherblock";
  }

  get drawings(){
    if(this.isLevels && this.token){
      return canvas.drawings.placeables.filter((d) => this.isWeatherBlocking(d) && _levels.isTokenInRange(this.token, d));
    }
    return canvas.drawings.placeables.filter((d) => this.isWeatherBlocking(d));
  }

  get token(){
    return canvas.tokens.controlled[0] ?? _levels.lastReleasedToken;
  }

  get integration(){
    if(!game.modules.get("betterroofs")?.active) return false;
    return game.settings.get("betterroofs", "wbIntegration")
  }

  setTicker(){
    canvas.app.ticker.add(game.WeatherBlocker.refresh);
  }

  initScene(){
    this.refreshMask();
    this.setMask();
    this.maskNeedsUpdate = true;
  }

  refresh(){
    if(!game.WeatherBlocker.maskNeedsUpdate) return;
    game.WeatherBlocker.maskNeedsUpdate = false;
    setTimeout(() => { game.WeatherBlocker.refreshMask(); }, 100);
  }

  refreshMask(){
    this.mask.clear();

    if (!this.inverted) this.mask.beginFill(0x000000).drawRect(0,0,canvas.scene.dimensions.width,canvas.scene.dimensions.height);
    
    const polygons = this.getPolygons();

    for(let p of polygons){
      if (!this.inverted) {
        this.mask.beginHole().drawPolygon(p).endHole();
      } else {
        this.mask.beginFill(0x000000).drawPolygon(p).endFill();
      }
    }
  }

  getPolygons(){
    const drawings = game.WeatherBlocker.drawings.map((d) => new PIXI.Polygon(this.adjustPolygonPoints(d)));
    if(this.inverted || !this.integration) return drawings;
    const rooms = [];
    for(let tile of canvas.foreground.placeables){
      if(this.roomFilter(tile)) rooms.push(tile.roomPoly);
    }
    return [...drawings, ...rooms];
  }

  roomFilter(tile){
    if(!tile.roomPoly) return false;
    const token = this.token
    const center = token ? new PIXI.Point(token.data.x+token.w/2,token.data.y+token.h/2) : new PIXI.Point(0,0);
    const tokenInTile = token && tile.roomPoly.contains(center.x, center.y)
    if(!tile.occluded && tile.alpha !== 0 && !tokenInTile) return false;
    if(!this.integration) return true;

    const { rangeBottom, rangeTop } = _levels.getFlagsForObject(tile);
    const underRoof = rangeTop == Infinity && token && token.data.elevation < rangeBottom
    return underRoof 
  }

  setMask(){
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

  setHooks(){

    Hooks.on("canvasInit", () => {
      canvas.weather.mask = null;
    });

    Hooks.on("canvasReady", () => {
      game.WeatherBlocker.initScene();
    })

    Hooks.on("createDrawing", () => {
      game.WeatherBlocker.maskNeedsUpdate = true;
    });
    
    Hooks.on("updateDrawing", () => {
      game.WeatherBlocker.maskNeedsUpdate = true;
    });
    
    Hooks.on("deleteDrawing", () => {
      game.WeatherBlocker.maskNeedsUpdate = true;
    });

    Hooks.on("updateToken",(token,updates)=>{
      if(!game.WeatherBlocker.isLevels) return;
      if("elevation" in updates || "x" in updates || "y" in updates){
        game.WeatherBlocker.maskNeedsUpdate = true;
      }
    })

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

  isWeatherBlocking(drawing){
    return drawing.data.text == "blockWeather";
  }

}

Hooks.on("init", () => {
  game.WeatherBlocker = new WeatherBlocker();
  game.WeatherBlocker.setHooks();
});

Hooks.on("ready", () => {
  game.WeatherBlocker.setTicker();
})


//Legacy compatibility
function refreshWheatherBlockingMask(){};