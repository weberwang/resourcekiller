'use strict';
let path = require("path")
let fs = require("fs")

let types = ["texture", "audioClip"]

let html = Editor.url("packages://resourcekiller/panel/killer.html")
let assetdb = Editor.assetdb;

Editor.Panel.extend({
  template: fs.readFileSync(html, "utf-8"),
  $: {
    killer: '#killer'
  },

  ready() {
    new window.Vue({
      el: this.$killer,
      data: {

      },

      methods: {
        onQuery: (e) => {
          Editor.log("开始查询...");
          assetdb.deepQuery((results) => {
            results && results.forEach(result => {
              Editor.log(result.name, result.extname, result.type)
            });
          })
          assetdb.refresh("db://assets");
        }
      }
    });
  },
});