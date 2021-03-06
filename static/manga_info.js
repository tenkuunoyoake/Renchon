function edit_text() {
  // Remove the "Submit Changes" button from the form
  var form = document.getElementById("edit_manga");
  form.removeChild(form.lastChild);
  // Transform all the text fields into input fields
  var manga_info = document.getElementsByClassName("manga_info");
  for (var i = 0; i < manga_info.length; i++) {
    var text = manga_info[i].innerHTML.replace(/<br>/g, "\n");
    if (i == 3) {
      manga_info[i].innerHTML = "<textarea cols='80' rows='10'" +
          "name='manga_description' required>" + text + "</textarea>";
    } else {
      manga_info[i].innerHTML = "<input type='text' value='" + text +
          "' required  />";
    }
  }
  // Change the function of the edit button
  var edit_button = document.getElementById("manga_edit");
  edit_button.value = "Save Manga Information";
  edit_button.onclick = save_text;
}

function save_text() {
  // Transform all the input fields back into text fields
  var manga_info = document.getElementsByClassName("manga_info");
  for (var i = 0; i < manga_info.length; i++) {
    var text = manga_info[i].firstChild.value;
    manga_info[i].innerHTML = text.replace(/\r\n|\r|\n/g, "<br>");
  }
  var edit_button = document.getElementById("manga_edit");
  edit_button.value = "Edit Manga Information";
  edit_button.onclick = edit_text;
  // Re-add the "Submit Changes" button to the form
  var button = document.createElement("input");
  button.type = "button";
  button.value = "Submit Changes";
  button.onclick = submit_manga_info;
  var form = document.getElementById("edit_manga");
  form.appendChild(button);
}

function edit_cover_photo() {
  document.getElementById("cover").click();
}

function submit_manga_info() {
  var request = {}
  var manga_info = document.getElementsByClassName("manga_info");
  var cover = document.getElementById("cover");
  request["manga_oldname"] = manga_name;
  request["manga_name"] = manga_info[0].innerHTML;
  request["manga_author"] = manga_info[1].innerHTML;
  request["manga_artist"] = manga_info[2].innerHTML;
  request["manga_description"] = manga_info[3].innerHTML;
  form = create_proxy_form(edit_manga_path, request);
  form.appendChild(cover);
  form.submit();
}

function delete_chapter(manga, chapter) {
  var re = /^Chapter\s(\d+(?:\.\d+)?)/;
  var chapter_num = re.exec(chapter)[1];
  var request = {chapter_delete_manga: manga,
      chapter_delete_chapter: chapter_num};
  send_post_request(delete_chapter_path, request);
}

/* Drag and Drop */

var form_data = null;
var form_data_success = false;
var chapter_data = {};
var current_unused_chapter = 0;
var total_pages = {};
var error_div = document.getElementById("chapter_error")

function allow_drop(event) {
  event.preventDefault();
}

function drop_chapter(event) {
  event.preventDefault();
  var data_transfer = event.dataTransfer;
  if (data_transfer && data_transfer.items) {
    var items = data_transfer.items;
    for (var i = 0; i < items.length; i++) {
      var entry = items[i].webkitGetAsEntry();
      if (entry.isDirectory) {
        traverse_filesystem(entry);
      } else if (entry.isFile) {
        // Show an error message saying that it must be a directory that
        // is uploaded.
      }
    }
  }
  document.getElementById("chapter_dropzone").className = "";
}

function traverse_filesystem(entry) {
  var reader = entry.createReader();
  var chapter_num = get_chapter_from_url(entry.fullPath);
  if (!chapter_data.hasOwnProperty(chapter_num)) {
    chapter_data[chapter_num] = [];
  } else {
    // Disallow duplicate chapters
    return;
  }
  reader.readEntries(function(entries) {
    total_pages[chapter_num] = entries.length;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isFile) {
        enter_into_chapter_data(entries[i], chapter_num);
      } else if (entries[i].isDirectory) {
        // Skip directories (hello __MACOSX)
        total_pages[chapter_num] -= 1;
      }
    }
  });
}

function enter_into_chapter_data(entry, chapter_num) {
  entry.file(function(file) {
    chapter_data[chapter_num].push(file);
    if (chapter_data[chapter_num].length == total_pages[chapter_num]) {
      add_chapter_element(chapter_num);
    }
    if (ready_to_submit()) {
      add_submit_element();
    }
  });
}

function add_submit_element() {
  var chapter_submit = document.getElementById("chapter_submit");
  if (!chapter_submit.innerHTML) {
    var submit_span = document.createElement("span");
    submit_span.id = "chapter_submit_button"
    submit_span.className = "chapter_submit";
    submit_span.onclick = upload_chapters;
    submit_span.innerHTML = "Submit All Chapters";
    chapter_submit.appendChild(submit_span);
  }
}

function add_chapter_element(chapter_num) {
  var chapter_list = document.getElementById("chapter_list");
  var list_element = document.createElement("li");
  var chapter_div = document.createElement("div");
  chapter_div.className = "chapter_admin_box";
  add_chapter_image_to_element(chapter_div, chapter_num);
  list_element.appendChild(chapter_div);
  chapter_list.appendChild(list_element);
}

function add_label_to_element(element, name, text) {
  label = document.createElement("label");
  label.setAttribute("for", name);
  label.innerHTML = text;
  element.appendChild(label);
}

function add_input_to_element(element, type, name, text, value) {
  text_input = document.createElement("input");
  text_input.setAttribute("type", type);
  text_input.setAttribute("name", name);
  if (value) {
    text_input.setAttribute("value", value);
  }
  text_input.setAttribute("required", true);
  add_label_to_element(element, name, text);
  element.appendChild(text_input);
  element.appendChild(document.createElement("br"));
}


function add_chapter_image_to_element(element, chapter_num) {
  var reader = new FileReader();
  reader.onload = function(event) {
    var image = new Image();
    image.src = event.target.result;
    image.className = "chapter_admin_box";
    element.appendChild(image);
    add_chapter_info_to_element(element, chapter_num);
  };
  for (var i = 0; i < chapter_data[chapter_num].length; i++) {
    var filename_ary = chapter_data[chapter_num][i].name.split(".");
    var ext = filename_ary[filename_ary.length - 1];
    if (ext == "jpg" || ext == "jpeg" || ext == "png") {
      reader.readAsDataURL(chapter_data[chapter_num][i]);
      break;
    }
  }
}

function add_chapter_info_to_element(element, chapter_num) {
  var display = document.createElement("div");
  var num_name = "chapter_num_" + chapter_num.toString();
  var num_string = "Chapter Number: ";
  var name_name = "chapter_name_" + chapter_num.toString();
  if (chapter_num >= 0) {
    add_input_to_element(display, "number", num_name, num_string, chapter_num);
  } else {
    add_input_to_element(display, "number", num_name, num_string);
  }
  add_input_to_element(display, "text", name_name, "Chapter Name: ");
  element.appendChild(display);
}

function ready_to_submit() {
  for (var chapter_num in total_pages) {
    if (chapter_data[chapter_num].length < total_pages[chapter_num]) {
      return false;
    }
  }
  return true;
}

/* Drag and Drop Helper Methods */

function init_dropzone() {
  document.getElementById("chapter_dropzone").ondragenter = function() {
    this.className = "dragover";
  }
  document.getElementById("chapter_dropzone").ondragleave = function() {
    this.className = "";
  }
}

function get_chapter_from_url(url) {
  var regex = /(\d+)$/
  var split_dir = url.split("/");
  var result = regex.exec(split_dir[split_dir.length - 1]);
  if (result) {
    return Number(result[1]);
  } else {
    current_unused_chapter -= 1;
    return current_unused_chapter;
  }
}

function create_form_data() {
  form_data = new FormData();
  form_data.append("manga_name", manga_name);
  add_chapter_info_to_form();
}

function add_chapter_info_to_form() {
  for (var property in chapter_data) {
    var num = document.getElementsByName("chapter_num_" + property)[0].value;
    var name = document.getElementsByName("chapter_name_" + property)[0].value;
    if (num == "") {
      var message = "<strong>Error:</strong> "
      message += " Chapter Number not specified for " + name + ".<br>";
      error_div.innerHTML += message;
      error_div.style.display = "block";
      continue;
    } else if (curr_chapter_nums.indexOf(Number(num)) > -1) {
      var message = "<strong>Error:</strong> "
      message += "Chapter " + num + " already exists.<br>";
      error_div.innerHTML += message;
      error_div.style.display = "block";
      continue;
    }
    form_data.append("chapter_num_" + property, num);
    form_data.append("chapter_name_" + property, name);
    for (var i = 0; i < chapter_data[property].length; i++) {
      form_data.append(property.toString(), chapter_data[property][i]);
    }
    form_data_success = true;
  }
}

function upload_chapters() {
  var dropzone = document.getElementById("chapter_dropzone");
  dropzone.parentNode.removeChild(dropzone);
  create_form_data();
  var request = new XMLHttpRequest();
  var submit_span = document.getElementById("chapter_submit_button");
  submit_span.className = "chapter_upload";
  if (form_data_success) {
    request.open('POST', '/add_chapter');
    request.onload = function() {
      text = "Chapters have been updated!"
      text += " Please refresh the page to see the updates.";
      submit_span.innerHTML = text;
    };
    request.upload.onprogress = function(event) {
      if (event.lengthComputable) {
        var complete = (event.loaded / event.total * 100 | 0);
        if (complete == 100) {
          text = "Upload complete! Girls do their best now and are preparing.";
          text += " Please wait warmly until the server is ready...";
          submit_span.innerHTML = text;
          clear_chapter_elements();
        } else {
          submit_span.innerHTML = "Uploaded: " + complete + "%";
        }
      }
    }
    submit_span.innerHTML = "Uploaded: 0%";
    request.send(form_data);
  } else {
    var message = "<strong>No files were uploaded to the server.</strong><br>";
    error_div.innerHTML += message;
    error_div.style.display = "block";
    submit_span.style.display = "none";
    clear_chapter_elements();
  }
}

/* General Helper Methods */

function clear_chapter_elements() {
  var chapter_list = document.getElementById("chapter_list");
  chapter_list.innerHTML = "";
}

function create_proxy_form(path, params) {
  var form = document.createElement("form");
  form.setAttribute("method", "post");
  form.setAttribute("action", path);
  form.setAttribute("enctype", "multipart/form-data");
  for (var key in params) {
    if (params.hasOwnProperty(key)) {
      hidden_field = document.createElement("input");
      hidden_field.setAttribute("type", "hidden");
      hidden_field.setAttribute("name", key);
      hidden_field.setAttribute("value", params[key]);
      form.appendChild(hidden_field);
    }
  }
  document.body.appendChild(form);
  return form;
}

function send_post_request(path, params) {
  form = create_proxy_form(path, params);
  form.submit();
}

function read_url(input) {
  if (input.files && input.files[0]) {
    reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById("cover_photo").src = e.target.result;
    }
    reader.readAsDataURL(input.files[0]);
  }
}

/* Initialisation */

init_dropzone();
