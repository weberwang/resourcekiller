# resourcekiller
请确保项目运行过一次才能正确检测到脚本的依赖关系
删除前请自行备份项目！！！
特点：
1.检测未直接引用的"texture", "audio-clip", "typescript", "javascript", "animation-clip"类型的资源
2.检测未被直接引用，也没有被继承的脚本
3.检测未被引用的动画剪辑中的spriteframe
4.递归删除空文件夹
5.支持多选，全选删除资源