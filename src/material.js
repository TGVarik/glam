glam.Material = {};

glam.Material.create = function(style, createCB) {
	var material = null;
	
	if (style) {
		var param = glam.Material.parseStyle(style);
		if (style.shader) {
			switch (style.shader.toLowerCase()) {
				case "phong" :
					material = new THREE.MeshPhongMaterial(param);
					break;
				case "lambert" :
					material = new THREE.MeshLambertMaterial(param);
					break;
				case "basic" :
				default :
					material = new THREE.MeshBasicMaterial(param);
					break;
			}
		}
		else if (style["shader-vertex"] && style["shader-fragment"] && style["shader-uniforms"]) {
			material = glam.Material.createShaderMaterial(style, param, createCB);
		}
		else {
			material = new THREE.MeshBasicMaterial(param);
		}
	}
	else {
		material = new THREE.MeshBasicMaterial();
	}
	
	return material;
}

glam.Material.parseStyle = function(style) {
	var image = "";
	if (style.image) {
		image = glam.Material.parseUrl(style.image);
	}
	
	var reflectivity;
	if (style.reflectivity)
		reflectivity = parseFloat(style.reflectivity);
	
	var refractionRatio;
	if (style.refractionRatio)
		refractionRatio = parseFloat(style.refractionRatio);
	
	var envMap = glam.Material.tryParseEnvMap(style);
	
	var diffuse;
	var specular;
	var css = "";

	if (css = style["color-diffuse"]) {
		diffuse = new THREE.Color().setStyle(css).getHex();
	}
	if (css = style["color-specular"]) {
		specular = new THREE.Color().setStyle(css).getHex();
	}
	
	var opacity;
	if (style.opacity)
		opacity = parseFloat(style.opacity);

	var side = THREE.DoubleSide;
	if (style["backface-visibility"]) {
		switch (style["backface-visibility"].toLowerCase()) {
			case "visible" :
				side = THREE.DoubleSide;
				break;
			case "hidden" :
				side = THREE.FrontSide;
				break;
		}
	}
	
	var wireframe;
	if (style.hasOwnProperty("render-mode"))
		wireframe = (style["render-mode"] == "wireframe");
	
	var param = {
	};
	
	if (image)
		param.map = THREE.ImageUtils.loadTexture(image);
	if (envMap)
		param.envMap = envMap;
	if (diffuse !== undefined)
		param.color = diffuse;
	if (specular !== undefined)
		param.specular = specular;
	if (opacity !== undefined) {
		param.opacity = opacity;
		param.transparent = opacity < 1;
	}
	if (wireframe !== undefined) {
		param.wireframe = wireframe;
	}
	if (reflectivity !== undefined)
		param.reflectivity = reflectivity;
	if (refractionRatio !== undefined)
		param.refractionRatio = refractionRatio;

	param.side = side;
	
	return param;
}

glam.Material.parseUrl = function(image) {
	var regExp = /\(([^)]+)\)/;
	var matches = regExp.exec(image);
	image = matches[1];
	return image;
}

glam.Material.tryParseEnvMap = function(style) {
	var urls = [];
	
	if (style["envmap-right"])
		urls.push(glam.Material.parseUrl(style["envmap-right"]));
	if (style["envmap-left"])
		urls.push(glam.Material.parseUrl(style["envmap-left"]));
	if (style["envmap-top"])
		urls.push(glam.Material.parseUrl(style["envmap-top"]));
	if (style["envmap-bottom"])
		urls.push(glam.Material.parseUrl(style["envmap-bottom"]));
	if (style["envmap-front"])
		urls.push(glam.Material.parseUrl(style["envmap-front"]));
	if (style["envmap-back"])
		urls.push(glam.Material.parseUrl(style["envmap-back"]));
	
	if (urls.length == 6) {
		var cubeTexture = THREE.ImageUtils.loadTextureCube( urls );
		return cubeTexture;
	}
	
	if (style["envmap"])
		return THREE.ImageUtils.loadTexture(glam.Material.parseUrl(style["envmap"]), THREE.SphericalRefractionMapping);
	
	return null;
}

glam.Material.createShaderMaterial = function(style, param, createCB) {
	
	function done() {
		var material = new THREE.ShaderMaterial({
			vertexShader : vstext,
			fragmentShader : fstext,
			uniforms: uniforms,
		});
		
		glam.Material.saveShaderMaterial(vsurl, fsurl, material);
		glam.Material.callShaderMaterialCallbacks(vsurl, fsurl);
	}
	
	var vs = style["shader-vertex"];
	var fs = style["shader-fragment"];
	var uniforms = glam.Material.parseUniforms(style["shader-uniforms"], param);

	var vsurl = glam.Material.parseUrl(vs);
	var fsurl = glam.Material.parseUrl(fs);

	if (!vsurl || !fsurl) {
		var vselt = document.getElementById(vs);
		var vstext = vselt.textContent;
		var fselt = document.getElementById(fs);
		var fstext = fselt.textContent;
		
		if (vstext && fstext) {
			return new THREE.ShaderMaterial({
				vertexShader : vstext,
				fragmentShader : fstext,
				uniforms: uniforms,
			});
		}
		else {
			return null;
		}
	}	
	
	var material = glam.Material.getShaderMaterial(vsurl, fsurl);
	if (material)
		return material;
	
	glam.Material.addShaderMaterialCallback(vsurl, fsurl, createCB);
	
	if (glam.Material.getShaderMaterialLoading(vsurl, fsurl))
		return;
	
	glam.Material.setShaderMaterialLoading(vsurl, fsurl);
	
	var vstext = "";
	var fstext = "";
	
	$.ajax({
	      type: 'GET',
	      url: vsurl,
	      dataType: "text",
	      success: function(result) { vstext = result; if (fstext) done(); },
	});	
	
	
	$.ajax({
	      type: 'GET',
	      url: fsurl,
	      dataType: "text",
	      success: function(result) { fstext = result; if (vstext) done(); },
	});	
}

glam.Material.parseUniforms = function(uniformsText, param) {
	
	var uniforms = {
	};
	
	var tokens = uniformsText.split(" ");

	var i, len = tokens.length / 3;
	for (i = 0; i < len; i++) {
		var name = tokens[i * 3];
		var type = tokens[i * 3 + 1];
		var value = tokens[i * 3 + 2];
		
		if (type == "f")
			value = parseFloat(value);
		else if (type == "t")
			value = param.envMap; // hack hack
		
		var uniform =  {
			type : type,
			value : value,
		};
		
		uniforms[name] = uniform;
	}
		
	return uniforms;
}

glam.Material.shaderMaterials = {};

glam.Material.saveShaderMaterial = function(vsurl, fsurl, material) {
	var key = vsurl + fsurl;
	var entry = glam.Material.shaderMaterials[key];
	entry.material = material;
	entry.loading = false;
}

glam.Material.addShaderMaterialCallback = function(vsurl, fsurl, cb) {
	var key = vsurl + fsurl;
	
	var entry = glam.Material.shaderMaterials[key];
	if (!entry) {
		glam.Material.shaderMaterials[key] = {
			material : null,
			loading : false,
			callbacks : [],
		};
	}
	
	glam.Material.shaderMaterials[key].callbacks.push(cb);
}

glam.Material.callShaderMaterialCallbacks = function(vsurl, fsurl) {
	var key = vsurl + fsurl;
	
	var entry = glam.Material.shaderMaterials[key];
	if (entry && entry.material) {
		for (cb in entry.callbacks) {
			entry.callbacks[cb](entry.material);
		}
	}
}

glam.Material.getShaderMaterial = function(vsurl, fsurl) {
	
	var key = vsurl + fsurl;
	var entry = glam.Material.shaderMaterials[key];
	if (entry) {
		return entry.material;
	}
	else {
		return null;
	}
}

glam.Material.setShaderMaterialLoading = function(vsurl, fsurl) {
	
	var key = vsurl + fsurl;
	var entry = glam.Material.shaderMaterials[key];
	if (entry) {
		entry.loading = true;
	}
}

glam.Material.getShaderMaterialLoading = function(vsurl, fsurl) {
	
	var key = vsurl + fsurl;
	var entry = glam.Material.shaderMaterials[key];
	return (entry && entry.loading);
}

glam.Material.addHandlers = function(docelt, obj) {

	docelt.setAttributeHandlers.push(function(attr, val) {
		glam.Material.onSetAttribute(obj, docelt, attr, val);
	});
}

glam.Material.onSetAttribute = function(obj, docelt, attr, val) {

	var material = obj.visuals[0].material;
	switch (attr) {
		case "color-diffuse" :
			material.color.setStyle(val);
			break;
	}
}
