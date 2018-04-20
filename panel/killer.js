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
    form: "#form"
  },

  messages: {
    onUnsedResults(sender, results) {
      this.vm.unusedResults = results;
    }
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
          Editor.success("开始查找未被直接引用的资源...");
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

        onDeleteItem(e, index) {
          let asseturl = this.unusedResults.splice(index, 1)[0];
          assetdb.delete(asseturl);
          this.deleteFinish();
        },

        onHintAsset(url) {
          if (assetdb.remote.exists(url)) {
            let uuid = assetdb.remote.urlToUuid(url);
            Editor.Ipc.sendToPanel("assets", 'assets:hint', uuid);
            Editor.Selection.select('asset', uuid, true);
          }
        },

        onDeleteItems() {
          let items = []
          for (const index of this.selectedIndexs.splice(0)) {
            items.push(this.unusedResults.splice(index, 1)[0])
          }
          assetdb.delete(items);
          this.deleteFinish();
        },

        onSelectedAll(event) {
          this.selectAll = !this.selectAll;
          if (this.selectAll) {
            for (const key in this.$els) {
              Editor.log(key)
            }
            Editor.log(this.selects)
            let selects = document.getElementById("form");

            // event.currentTarget.className = "fa fa-check-square-o";
            this.selectedIndexs = this.unusedResults.concat();
          } else {
            // event.currentTarget.className = "fa fa-check-square";
            this.selectedIndexs.splice(0);
          }
        },

        deleteFinish() {
          findAssets.findEmptyFinder();
          Editor.success("清理完成")
        }
      }
    });
  },
});