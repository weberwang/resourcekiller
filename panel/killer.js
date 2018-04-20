'use strict';
let fs = require("fs");
let findAssets = require(Editor.url('packages://resourcekiller/panel/findAssets'))
let html = Editor.url("packages://resourcekiller/panel/killer.html")
let css = Editor.url("packages://resourcekiller/panel/killer.css")

let assetdb = Editor.assetdb;

Editor.Panel.extend({
  template: fs.readFileSync(html, "utf-8"),
  style: fs.readFileSync(css, 'utf-8'),
  vm: null,
  $: {
    killer: '#killer',
  },

  messages: {
    onUnsedResults(sender, results) {
      this.vm.unusedResults = results;
    }
  },

  mounted() {
    Editor.log("mounted======>")
  },
  ready() {
    this.vm = new window.Vue({
      el: this.$killer,
      data: {
        unusedResults: [],
        selectedIndexs: [],
        selectAll: false
      },

      methods: {
        onQuery(e) {
          Editor.log("开始查询...");
          this.selectedIndexs = [];
          findAssets.findAllUsedResource();
        },

        onSelected(event, index) {
          let idx = this.selectedIndexs.indexOf(index)
          if (idx === -1) {
            // event.currentTarget.className = "fa fa-check-square-o";
            this.selectedIndexs.push(index);
          } else {
            // event.currentTarget.className = "fa fa-check-square";
            this.selectedIndexs.splice(idx, 1);
          }
        },

        onDeleteItem(index) {
          let asseturl = this.unusedResults.splice(index, 1)[0];
          assetdb.delete(asseturl);
        },

        onHintAsset(url) {
          if (assetdb.remote.exists(url)) {
            let uuid = assetdb.remote.urlToUuid(url);
            Editor.Ipc.sendToPanel("assets", 'assets:hint', uuid);
            Editor.Selection.select('asset', uuid, true);
          }
        },

        onDeleteItems() {
          for (const index of this.selectedIndexs) {
            Editor.log("onDeleteItems====>", index);
            this.onDeleteItem(index);
          }
          this.selectedIndexs.splice(0);
        },

        onSelectedAll(event) {
          this.selectAll = !this.selectAll;
          if (this.selectAll) {
            for (const key in this.$els) {
              Editor.log(key)
            }
            // let selects = document.getElementById("form");
            // Editor.log(selects.length, selects[0])
            // event.currentTarget.className = "fa fa-check-square-o";
            this.selectedIndexs = this.unusedResults.concat();
          } else {
            // event.currentTarget.className = "fa fa-check-square";
            this.selectedIndexs.splice(0);
          }
        }
      }
    });
  },
});