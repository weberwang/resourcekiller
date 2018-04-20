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
      this.vm.unusedResults.splice(0);
      results.forEach(url => {
        this.vm.unusedResults.push({
          url: url,
          checked: this.selectAll
        });
      });
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
          let result = this.unscheduleAllCallbacks[index];
          let idx = this.selectedIndexs.indexOf(result.url);
          if (idx === -1) {
            result.checked = true;
            this.selectedIndexs.push(result.url);
          } else {
            result.checked = false;
            this.selectedIndexs.splice(idx, 1);
          }
        },

        onDeleteItem(e, index) {
          let asseturl = this.unusedResults.splice(index, 1)[0];
          assetdb.delete(asseturl.url);
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
          assetdb.delete(this.selectedIndexs.splice(0));
          this.deleteFinish();
        },

        onSelectedAll(event) {
          this.selectAll = !this.selectAll;
          if (this.selectAll) {
            this.unusedResults.forEach((result) => {
              result.checked = true;
              this.selectedIndexs.push(result.url);
            });
          } else {
            this.unusedResults.forEach((result) => {
              result.checked = false;
            });
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