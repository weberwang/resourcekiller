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
      if (results.lenght === 0) Editor.success("未找到没有引用的资源");
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

        onSelected(event, result) {
          // let result = this.unusedResults[index];
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

        onHintAsset(result) {
          let url = result.url;
          if (assetdb.remote.exists(url)) {
            let uuid = assetdb.remote.urlToUuid(url);
            Editor.Ipc.sendToPanel("assets", 'assets:hint', uuid);
            Editor.Selection.select('asset', uuid, true);
          }
        },

        onDeleteItems() {
          let urls = this.selectedIndexs.splice(0);
          for (const url of urls) {
            for (let index = this.unusedResults.length - 1; index > -1; index--) {
              if (this.unusedResults[index].url === url) {
                this.unusedResults.splice(index, 1);
              }
            }
          }
          assetdb.delete(urls);
          this.deleteFinish();
        },

        onSelectedAll(event) {
          this.selectAll = !this.selectAll;
          if (this.selectAll) {
            this.unusedResults.forEach((result) => {
              result.checked = true;
              if (this.selectedIndexs.indexOf(result.url) === -1) this.selectedIndexs.push(result.url);
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