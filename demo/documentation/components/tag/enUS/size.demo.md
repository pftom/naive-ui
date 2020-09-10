# Size
```html
<n-tag
  size="small"
  closable
  @close="handleClose"
>
  Real Love
</n-tag>
<n-tag
  closable
  @close="handleClose"
>
  Real Love
</n-tag>
<n-tag
  type="success"
  size="large"
  closable
  @close="handleClose"
>
  Yes It Is
</n-tag>
```
```js
export default {
  methods: {
    handleClose () {
      this.$NMessage.info('tag close')
    }
  }
}
```
```css
.n-tag {
  margin-right: 12px;
  margin-bottom: 8px;
}
```