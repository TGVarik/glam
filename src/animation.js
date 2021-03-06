/**
 * @fileoverview animation parser/implementation
 * 
 * @author Tony Parisi
 */

glam.Animation = {};

glam.Animation.DEFAULT_DURATION = "1s";
glam.Animation.DEFAULT_ITERATION_COUNT = "1";
glam.Animation.DEFAULT_TIMING_FUNCTION = "linear";
glam.Animation.DEFAULT_FRAME_TIME = "0%";
glam.Animation.DEFAULT_FRAME_PROPERTY = "transform";

glam.Animation.create = function(docelt) {

	var id = docelt.id;
	var duration = docelt.getAttribute('duration') || glam.Animation.DEFAULT_DURATION;
	var iterationCount = docelt.getAttribute('iteration-count') || glam.Animation.DEFAULT_ITERATION_COUNT;
	var timingFunction = docelt.getAttribute('timing-function') || glam.Animation.DEFAULT_TIMING_FUNCTION;
	
	duration = glam.Animation.parseTime(duration);
	var easing = glam.Animation.parseTimingFunction(timingFunction);
	var loop = (iterationCount.toLowerCase() == "infinite") ? true : false;
	
	var i, 
		children = docelt.childNodes, 
		len = children.length,
		frames = [];
	
	for (i = 0; i < len; i++) {
		var childelt = children[i];
		var tag = childelt.tagName;
		if (tag)
			tag = tag.toLowerCase();
		
		if (tag == "keyframe") {
			var frame = glam.Animation.parseFrame(childelt);
			frames.push(frame);
		}
	}
	
	var anim = glam.Animation.build(duration, loop, easing, frames);
	
	glam.addAnimation(id, anim);
	glam.Animation.callParseCallbacks(id, anim);
}

glam.Animation.parseFrame = function(docelt) {

	var time = docelt.getAttribute('time') || glam.Animation.DEFAULT_FRAME_TIME;
	var frametime = glam.Animation.parseFrameTime(time);
	var property = docelt.getAttribute('property') || glam.Animation.DEFAULT_FRAME_PROPERTY;
	var value = docelt.getAttribute('value') || "";
	
	if (property == "transform") {
		var t = {};
		glam.Transform.parseTransform(value, t);

		return {
			time : frametime,
			value : t,
			type : "transform",
		};
	}
	else if (property == "material") {

		var s = glam.Animation.parseMaterial(value);
		var param = glam.Material.parseStyle(s);

		return {
			time : frametime,
			value : param,
			type : "material",
		};
	}
	
}

glam.Animation.createFromStyle = function(docelt, style, obj) {
	var animationSpec,
		animationName,
		duration,
		timingFunction,
		easing,
		delayTime,
		iterationCount,
		loop;

	animationName = style["animation-name"]
	                          || style["-webkit-animation-name"]
	 		                  || style["-moz-animation-name"];
	
	if (animationName) {
		duration = style["animation-duration"]
	            || style["-webkit-animation-duration"]
	 		      || style["-moz-animation-duration"];

		
		timingFunction = style["animation-timing-function"]
		                    || style["-webkit-animation-timing-function"]
				 		      || style["-moz-animation-timing-function"];
		
		iterationCount = style["animation-iteration-count"]
			                    || style["-webkit-animation-iteration-count"]
					 		      || style["-moz-animation-iteration-count"];
	}
	else {
		animationSpec = style["animation"]
		                      || style["-webkit-animation"]
		 		 		      || style["-moz-animation"];
		
		if (animationSpec) {
			// name duration timing-function delay iteration-count direction
			var split = animationSpec.split("\\s+");
			animationName = split[0];
			duration = split[1];
			timingFunction = split[2];
			delayTime = split[3];
			iterationCount = split[4];
			
		}
	}
	
    duration = duration || glam.Animation.DEFAULT_DURATION;
	duration = glam.Animation.parseTime(duration);
    timingFunction = timingFunction || glam.Animation.DEFAULT_TIMING_FUNCTION;
	easing = glam.Animation.parseTimingFunction(timingFunction);
    iterationCount = iterationCount || glam.Animation.DEFAULT_ITERATION_COUNT;
	loop = (iterationCount.toLowerCase() == "infinite") ? true : false;				
	
	if (animationName) {
		var animation = glam.getStyle(animationName);
		
		var frames = [];
		
		for (var k in animation) {
			var frametime;
			if (k == 'from') {
				frametime = 0; 
			}
			else if (k == 'to') {
				frametime = 1;
			}
			else {
				frametime = glam.Animation.parseFrameTime(k);
			}

			var framevalue;
			var framedata = animation[k];
			for (prop in framedata) {
				var value = framedata[prop];
				var type;
				if (prop == "transform" ||
						prop == "-webkit-transform" ||
						prop == "-moz-transform") {
					
					type = "transform";
					framevalue = {};
					glam.Transform.parseTransform(value, framevalue);
				}
				else if (prop == "opacity" || prop == "color") {
					type = "material";
					framevalue = glam.Material.parseStyle(framedata);
				}
				
				var frame = {
						time : frametime,
						value : framevalue,
						type : type,
					};
				frames.push(frame);
			}			
		}
		
		var anim = glam.Animation.build(duration, loop, easing, frames);
		glam.Animation.addAnimationToObject(anim, obj);
	}
	
}

glam.Animation.build = function(duration, loop, easing, frames) {

	var poskeys = [];
	var posvalues = [];
	var rotkeys = [];
	var rotvalues = [];
	var sclkeys = [];
	var sclvalues = [];
	var opakeys = [];
	var opavalues = [];
	var colorkeys = [];
	var colorvalues = [];
	
	var i, len = frames.length;
	
	for (i = 0; i < len; i++) {
		var frame = frames[i];
		var val = frame.value;
		if (frame.type == "transform") {
			if ("x" in val || "y" in val || "z" in val) {
				poskeys.push(frame.time);
				var value = {
				};
				if ("x" in val) {
					value.x = val.x;
				}
				if ("y" in val) {
					value.y = val.y;
				}
				if ("z" in val) {
					value.z = val.z;
				}
				posvalues.push(value);
			}
			if ("rx" in val || "ry" in val || "rz" in val) {
				rotkeys.push(frame.time);
				var value = {
				};
				if ("rx" in val) {
					value.x = val.rx;
				}
				if ("ry" in val) {
					value.y = val.ry;
				}
				if ("rz" in val) {
					value.z = val.rz;
				}
				rotvalues.push(value);
			}
			if ("sx" in val || "sy" in val || "sz" in val) {
				sclkeys.push(frame.time);
				var value = {
				};
				if ("sx" in val) {
					value.x = val.sx;
				}
				if ("sy" in val) {
					value.y = val.sy;
				}
				if ("sz" in val) {
					value.z = val.sz;
				}
				sclvalues.push(value);
			}
		}
		else if (frame.type == "material") {
			if ("opacity" in val) {
				opakeys.push(frame.time);
				opavalues.push( { opacity : parseFloat(val.opacity) });
			}
			if ("color" in val) {
				colorkeys.push(frame.time);
				var rgbColor = new THREE.Color(val.color);
				colorvalues.push( { r : rgbColor.r, g: rgbColor.g, b: rgbColor.b });
			}
		}
	}
	
	var anim = {
		duration : duration,
		loop : loop,
		easing : easing,
		poskeys : poskeys,
		posvalues : posvalues,
		rotkeys : rotkeys,
		rotvalues : rotvalues,
		sclkeys : sclkeys,
		sclvalues : sclvalues,
		opakeys : opakeys,
		opavalues : opavalues,
		colorkeys : colorkeys,
		colorvalues : colorvalues,
	};

	return anim;
}

glam.Animation.parseTime = function(time) {
	var index = time.indexOf("ms");
	if (index != -1)
		return parseFloat(time.split("ms")[0]);
	
	var index = time.indexOf("s");
	if (index != -1)
		return parseFloat(time.split("s")[0]) * 1000;
	
}

glam.Animation.parseFrameTime = function(time) {
	var index = time.indexOf("%");
	if (index != -1)
		return parseFloat(time.split("%")[0]) / 100;
	else
		return parseFloat(time);
}

glam.Animation.parseTimingFunction = function(timingFunction) {
	timingFunction = timingFunction.toLowerCase();
	switch (timingFunction) {
	
		case "linear" :
			return TWEEN.Easing.Linear.None;
			break;
		
		case "ease-in-out" :
		default :
			return TWEEN.Easing.Quadratic.InOut;
			break;
		
	}
}

glam.Animation.parseMaterial = function(value) {

	var s = {};
	
	var values = value.split(";");
	var i, len = values.length;
	for (i = 0; i < len; i++) {
		var val = values[i];
		if (val) {
			var valsplit = val.split(":");
			var valname = valsplit[0];
			var valval = valsplit[1];
			
			s[valname] = valval;
		}
	}
	
	return s;
}

glam.Animation.parse = function(docelt, style, obj) {
	var animationId = docelt.getAttribute('animation');
	if (animationId) {
		var animation = glam.getAnimation(animationId);
		if (animation) {
			glam.Animation.addAnimationToObject(animation, obj);
		}
		else {
			glam.Animation.addParseCallback(animationId, function(animation) {
				glam.Animation.addAnimationToObject(animation, obj);				
			});
		}
	}
	else {
		glam.Animation.createFromStyle(docelt, style, obj);
	}
}

glam.Animation.addAnimationToObject = function(animation, obj) {
		
	var interps = [];
	if (animation.poskeys.length) {
		interps.push({
			keys : animation.poskeys,
			values : animation.posvalues,
			target : obj.transform.position,
		});
	}
	if (animation.rotkeys.length) {
		interps.push({
			keys : animation.rotkeys,
			values : animation.rotvalues,
			target : obj.transform.rotation,
		});
	}
	if (animation.sclkeys.length) {
		interps.push({
			keys : animation.sclkeys,
			values : animation.sclvalues,
			target : obj.transform.scale,
		});
	}
	if (animation.opakeys.length) {
		interps.push({
			keys : animation.opakeys,
			values : animation.opavalues,
			target : obj.visuals[0].material,
		});
	}
	if (animation.colorkeys.length) {
		interps.push({
			keys : animation.colorkeys,
			values : animation.colorvalues,
			target : obj.visuals[0].material.color,
		});
	}
	var loop = animation.iterationCount > 1;
	
	if (interps.length) {
		var kf = new Vizi.KeyFrameAnimator({ interps: interps, 
			duration : animation.duration, 
			loop : animation.loop, 
			easing: animation.easing
		});
		obj.addComponent(kf);
		
		kf.start();
	}
}

glam.Animation.parseCallbacks = {};

glam.Animation.addParseCallback = function(id, cb) {
	var cbs = glam.Animation.parseCallbacks[id];
	if (!cbs) {
		cbs = { callbacks : [] };
		glam.Animation.parseCallbacks[id] = cbs;
	}

	cbs.callbacks.push(cb);
	
}

glam.Animation.callParseCallbacks = function(id, anim) {
	var cbs = glam.Animation.parseCallbacks[id];
	if (cbs) {
		var callbacks = cbs.callbacks;
		var i, len = callbacks.length;
		for (i = 0; i < len; i++) {
			var cb = callbacks[i];
			cb(anim);
		}
	}
}
