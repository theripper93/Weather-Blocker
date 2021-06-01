Hooks.on("canvasReady",()=>{
  refreshWheatherBlockingMask();
})

Hooks.on("createDrawing",()=>{
  refreshWheatherBlockingMask();
})

Hooks.on("updateDrawing",()=>{
  refreshWheatherBlockingMask();
})

Hooks.on("deleteDrawing",()=>{
  refreshWheatherBlockingMask();
})

function refreshWheatherBlockingMask() {
  let g = new PIXI.Graphics();
  g.beginFill(0x000000).drawRect(0, 0, canvas.scene.dimensions.width, canvas.scene.dimensions.height);
  function adjustPolygonPoints(drawing) {
    let globalPoints = [];
    drawing.data.points.forEach((p) => {
      globalPoints.push(p[0] + drawing.x, p[1] + drawing.y);
    });
    return globalPoints;
  }
  let weatherBlockDrawings = canvas.drawings.placeables.filter(
    (d) => d.data.text == "blockWeather" && d.data.points.length != 0
  );
  weatherBlockDrawings.forEach(drawing => {
    let p = new PIXI.Polygon(adjustPolygonPoints(drawing));
    g.beginHole().drawPolygon(p).endHole();
  });
  canvas.foreground.placeables.forEach((t)=>{
    if(t.roomPoly && (t.occluded || t.alpha == 0 || (canvas.tokens.controlled[0] && t.roomPoly.contains(canvas.tokens.controlled[0].center.x,canvas.tokens.controlled[0].center.y)))){
      g.beginHole().drawPolygon(t.roomPoly).endHole();
    }
  })
  canvas.effects.mask = g;
  g.name = "weatherBlock";
  canvas.effects.children.forEach((c) => {
    if (c.name == "weatherBlock")
      c.destroy();
  });
  canvas.effects.addChild(g);
}