/**********************************************************************
    Freeciv-web - the web version of Freeciv. https://www.freeciv.org/
    Copyright (C) 2009-2016  The Freeciv-web project

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

***********************************************************************/

declare const $: any;
declare function swal(message: string): void;
declare function is_small_screen(): boolean;
declare function send_message_delayed(message: string, delay: number): void;
declare function load_game_toggle(): void;

/**************************************************************************
...
**************************************************************************/
export function show_map_from_image_dialog(): void {
  // reset dialog page.
  $("#upload_dialog").remove();
  $("<div id='upload_dialog'></div>").appendTo("div#game_page");
  const html: string = "Select a savegame file: <input type='file' id='mapFileInput'><br><br>"
              +"Select tile colors:<br>"
              +"<table><tr><td>Grassland:</td><td><input type='text' id='mapimg_grassland' /></td></tr>"
              +"<tr><td>Desert:</td><td><input type='text' id='mapimg_desert' /></td></tr>"
              +"<tr><td>Mountains:</td><td><input type='text' id='mapimg_mountains' /></td></tr>"
              +"<tr><td>Hills:</td><td><input type='text' id='mapimg_hills' /></td></tr>"
              +"<tr><td>Ocean:</td><td><input type='text' id='mapimg_ocean' /></td></tr>"
              +"<tr><td>Coast:</td><td><input type='text' id='mapimg_coast' /></td></tr></table>";

  $("#upload_dialog").html(html);
  $("#upload_dialog").attr("title", "Create game map from uploaded image");
  $("#upload_dialog").dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "55%" : "40%",
			buttons: {
                                "Cancel" : function() {
                                  $("#upload_dialog").dialog('close');
                                },
	  			"Upload": function() {
                                  $.blockUI();
                                  handle_map_image_upload();
                                  $("#upload_dialog").dialog('close');
   				}
			}
		});
  $("#upload_dialog").dialog('open');
  $("#mapimg_grassland").spectrum({
    color: "#407c26"
  });
  $("#mapimg_desert").spectrum({
    color: "#f0dc9b"
  });
  $("#mapimg_mountains").spectrum({
    color: "#43481f"
  });
  $("#mapimg_hills").spectrum({
    color: "#3d4f1f"
  });
  $("#mapimg_ocean").spectrum({
    color: "#081424"
  });
  $("#mapimg_coast").spectrum({
    color: "#143f79"
  });

}

/**************************************************************************
...
**************************************************************************/
export function handle_map_image_upload(): void {
  const fileInput = document.getElementById('mapFileInput') as HTMLInputElement | null;
  if (!fileInput) {
    $.unblockUI();
    swal("Please upload a image file!");
    return;
  }
  const file = fileInput.files ? fileInput.files[0] : null;

  if (file == null) {
    $.unblockUI();
    swal("Please upload a image file!");
    return;
  }

  if (!(window.FileReader)) {
    $.unblockUI();
    swal("Uploading files not supported");
    return;
  }

  const extension = file.name.substring(file.name.lastIndexOf('.'));
  console.log("Loading map image of type: " + file.type + " with extention " + extension);

  if (extension == '.png' || extension == '.bmp' || extension == '.jpg' || extension == '.jpeg' || extension == '.JPG') {
    const reader = new FileReader();
    reader.onload = function(e: ProgressEvent<FileReader>) {
      doImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  } else {
    $.unblockUI();
    swal("Image file " + file.name + "  not supported: " + file.type);
    console.error("Image file not supported: " + file.type);
  }

  $("#upload_dialog").dialog('close');
  $("#dialog").dialog('close');

}

/**************************************************************************
...
**************************************************************************/
export function doImage(image_data: string): void {
  const mycanvas = document.createElement("canvas");
  mycanvas.width = 120;
  mycanvas.height = 80;
  const context = mycanvas.getContext("2d");

  const img = new Image();
  img.onload = function() {
      if (context) {
        context.drawImage(img, 0, 0, this.width, this.height, 0, 0, 120, 80);
        handle_image_ctx(context);
      }
  };
  img.src = image_data;
 
}

/**************************************************************************
...
**************************************************************************/
export function handle_image_ctx(ctx: CanvasRenderingContext2D): void {
  const savetxt = process_image(ctx);

  /* Post map to server.*/
  $.ajax({
    type: "POST",
    url: "/freeciv-earth-mapgen",
    data: (savetxt + ";" + 120 + ";" + 80)
  }).done(function(savegame: any) {
    send_message_delayed("/load " + savegame, 1200);
    setTimeout(load_game_toggle, 1300);
    swal("Game map created from the image you uploaded. Game ready to start.");
    $.unblockUI();
  })
  .fail(function() {
    swal("Something failed. Please try again later!");
    $.unblockUI();

  })

}

/**************************************************************************
...
**************************************************************************/
export function process_image(ctx: CanvasRenderingContext2D): string {
  let mapline = "";
  const height = 80;
  const width = 120;
  /* process image pixels which are drawn on the canvas.*/
  for (let y = 0; y < height; y++) {
    mapline += "t" + zeroFill(y, 4) + '="';
    for (let x = 0; x < width; x++) {
      const pixel = ctx.getImageData(x, y, 1, 1);
      mapline += get_map_terrain_type(x, y, pixel.data);
    }
    mapline += '"\n';
  }
  console.log(mapline)
  return mapline;

}

/**************************************************************************
...
**************************************************************************/
export function zeroFill(number: number, width: number): string {
  width -= number.toString().length;
  if (width > 0) {
    return new Array(width + (/\./.test(number.toString()) ? 2 : 1)).join('0') + number;
  }
  return number + ""; 
}

/**************************************************************************
...
**************************************************************************/
export function get_map_terrain_type(x: number, y: number, pixel: Uint8ClampedArray): string {
  const rnd = Math.random();
  if (pixel_color(255,255,255, pixel, 20)) return "a";  //arctic
  if (pixel_color($("#mapimg_grassland").spectrum("get")['_r'], $("#mapimg_grassland").spectrum("get")['_g'], $("#mapimg_grassland").spectrum("get")['_b'], pixel, 40)) return "g"; //grassland
  if (pixel_color(84, 73, 38, pixel, 20) ) return "t";   //tundra
  if (pixel_color($("#mapimg_desert").spectrum("get")['_r'], $("#mapimg_desert").spectrum("get")['_g'], $("#mapimg_desert").spectrum("get")['_b'], pixel, 100) ) return "d"; //desert
  if (pixel_color(44, 52, 28, pixel, 10)) return "f"; //forest
  if (pixel_color(37, 64, 27, pixel, 10)) return "g"; //jungle
  if (pixel_color(60, 89, 38, pixel, 30)) return "g"; //jungle
  if (pixel_color(204, 99, 40, pixel, 100)) return "d"; //desert
  if (pixel_color($("#mapimg_mountains").spectrum("get")['_r'], $("#mapimg_mountains").spectrum("get")['_g'], $("#mapimg_mountains").spectrum("get")['_b'], pixel, 10)) return "m"; //mountains
  if (pixel_color($("#mapimg_hills").spectrum("get")['_r'], $("#mapimg_hills").spectrum("get")['_g'], $("#mapimg_hills").spectrum("get")['_b'], pixel, 10)) return "h"; //hills
  if (pixel_color($("#mapimg_ocean").spectrum("get")['_r'], $("#mapimg_ocean").spectrum("get")['_g'], $("#mapimg_ocean").spectrum("get")['_b'], pixel, 40)) return ":";  //ocean
  if (pixel_color($("#mapimg_coast").spectrum("get")['_r'], $("#mapimg_coast").spectrum("get")['_g'], $("#mapimg_coast").spectrum("get")['_b'], pixel, 15)) return " ";  //coast
  if (pixel_color(39, 57, 61, pixel, 35)) return " ";  //coast

  if (rnd < 4) return "p"; //plains
  if (rnd >= 4 && rnd <= 6) return "h";  //hills
  if (rnd >= 6 && rnd < 7) return "t";  //tundra 
  if (rnd >= 7) return "g";  //grassland 

  return "p"; // fallback
}

/**************************************************************************
...
**************************************************************************/
export function pixel_color(colorRed: number, colorGreen: number, colorBlue: number, pixel: Uint8ClampedArray, threshold: number): boolean {
    const diffR = (colorRed - pixel[0]);
    const diffG = (colorGreen - pixel[1]);
    const diffB = (colorBlue - pixel[2]);
    return (Math.sqrt(diffR*diffR + diffG*diffG + diffB*diffB) < threshold);
}
