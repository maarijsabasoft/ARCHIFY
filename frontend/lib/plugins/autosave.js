'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = autosave;

var _projectActions = require('../actions/project-actions');

var localStorage = window.hasOwnProperty('localStorage') ? window.localStorage : false;


var TIMEOUT_DELAY = 500;

var timeout = null;

// Valid catalog element types - used to filter out invalid items before loading
var VALID_ITEMS = ['sofa', 'table', 'sedia', 'armchairs', 'bench', 'bookcase', 'wardrobe', 'kitchen', 'sink', 'fridge', 'tv', 'desk', 'conditioner', 'trash', 'umbrella-stand', 'hanger', 'coat-hook', 'cube', 'projector', 'blackboard', 'camera', 'balcony', 'simple-stair', 'chairdesk', 'hub', 'hiroos', 'school-desk', 'school-desk-double', 'double school desk', 'child chair desk', 'canteen table', 'canteen cart', 'cleaning cart', 'fire-extinguisher', 'smoke-detector', 'radiator-old-style', 'termosifone_alluminio', 'recycling-bins', 'router_wifi', 'schneider', 'teaching-post', 'text', 'three- phase panel', 'naspo', 'monitor_pc', 'metal_detector', 'multimedia chalkboard', 'image', 'pannello_elettrico', 'round column', 'square column'];
var VALID_HOLES = ['door', 'double door', 'sliding door', 'window', 'sash window', 'venetian-blind-window', 'window-curtain', 'gate', 'panic door', 'double panic door'];
var VALID_LINES = ['wall'];

// Sanitize design to remove invalid elements
function sanitizeDesign(design) {
  if (!design || !design.layers) return design;

  Object.keys(design.layers).forEach(function (layerId) {
    var layer = design.layers[layerId];

    // Items added through the editor work fine (they have Immutable properties)
    // Only AI-generated items from JSON cause issues
    // Keep existing items as they are

    // Remove ALL areas - they cause "Element undefined does not exist in catalog" errors
    if (layer.areas && Object.keys(layer.areas).length > 0) {
      console.warn('Autosave: Removing all areas to prevent catalog errors');
      layer.areas = {};
    }

    // Filter invalid holes
    if (layer.holes) {
      Object.keys(layer.holes).forEach(function (holeId) {
        var hole = layer.holes[holeId];
        if (VALID_HOLES.indexOf(hole.type) === -1) {
          console.warn('Autosave: Removing invalid hole type:', hole.type);
          if (hole.line && layer.lines && layer.lines[hole.line] && layer.lines[hole.line].holes) {
            var idx = layer.lines[hole.line].holes.indexOf(holeId);
            if (idx > -1) layer.lines[hole.line].holes.splice(idx, 1);
          }
          delete layer.holes[holeId];
        }
      });
    }

    // Filter invalid lines
    if (layer.lines) {
      Object.keys(layer.lines).forEach(function (lineId) {
        if (VALID_LINES.indexOf(layer.lines[lineId].type) === -1) {
          console.warn('Autosave: Removing invalid line type:', layer.lines[lineId].type);
          delete layer.lines[lineId];
        }
      });
    }
  });

  return design;
}

function autosave(autosaveKey, delay) {

  return function (store, stateExtractor) {

    delay = delay || TIMEOUT_DELAY;

    if (!autosaveKey) return;
    if (!localStorage) return;

    //revert
    if (localStorage.getItem(autosaveKey) !== null) {
      var data = localStorage.getItem(autosaveKey);
      try {
        var json = JSON.parse(data);
        // Sanitize the design before loading to remove invalid items
        json = sanitizeDesign(json);
        store.dispatch((0, _projectActions.loadProject)(json));
      } catch (e) {
        console.error('Failed to load autosaved project:', e);
        localStorage.removeItem(autosaveKey);
      }
    }

    //update
    store.subscribe(function () {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(function () {
        var state = stateExtractor(store.getState());
        localStorage.setItem(autosaveKey, JSON.stringify(state.scene.toJS()));
        /*let scene = state.sceneHistory.last;
        if (scene) {
          let json = JSON.stringify(scene.toJS());
          localStorage.setItem(autosaveKey, json);
        }*/
      }, delay);
    });
  };
}