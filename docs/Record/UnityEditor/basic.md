# Unity 中关于编辑器拓展的基础知识


## Attribute (主要是下文会用到的)

- `[MenuItem("FolderName/ItemName")]` : 在Unity的面板上创建一个按钮，后文用于创建。
- `[ContextMenu(nameof(FunctionName))]` : 右键component可以选择展示一个函数。

!!! warning ""
    注意与下面这个标签区分。该标签用以生成资源文件，而不是调用某个过程。<br/>
    `[CreateAssetMenu(fileName = "SO", menuName = "Editor/SO")]` 

- [CustomEditor(typeof(Class))] : 用以拓展某个继承component的class的editor面板
## How to expand the editor

??? note "Example"
    ``` cpp

    [CustomEditor(typeof(SaveTool))]

    public class InspectorExampleEditor : Editor {
        //定义序列化属性
        private SerializedProperty intValue;
        private SerializedProperty saveDP;

        private void OnEnable() {
            //通过名字查找被序列化属性。
            intValue = serializedObject.FindProperty("components");
            saveDP = serializedObject.FindProperty("SaveDuringPlay");
        }

        public override void OnInspectorGUI() {
            //表示更新序列化物体
            serializedObject.Update();
            EditorGUILayout.PropertyField(intValue);
            EditorGUILayout.PropertyField(saveDP);
            //应用修改的属性值，不加的话，Inspector面板的值修改不了
            serializedObject.ApplyModifiedProperties();
        }
    }
    ```


- 在第一步中，我们将创建一个新类，并继承自`Editor`，加上CustomEditor的标签，用以说明我们是对SaveTool这个类进行拓展。
- 首先要明确的是，我们在inspect窗口进行修改的，并不是实际的c++或c#中的对象，而是通过一个叫`SerializedObject`中的property进行互相的索引实现修改。而在editor当中，已经声明了一个该类的对象`serializedObject`，所以我们直接调用该对象的方法`FindProperty("property'sName")`用以找到该类对应在面板上的映射，其类型为`SerializedProperty`;
- 在使用该方法修改类的显示之后，我们就需要自行去展示那些可序列化对象，所以需要调用`EditorGUILayout.PropertyField(SerializedProperty sp)`让其在面板上展示。
- 额外说明：`serializedObject.ApplyModifiedProperties();`需要添加到一些会函数之中，以应用我们对sp的修改。诸如上文提及，我们修改表明的sp，并不是真实的对象，所以需要这一步来实现真实的修改。

## How to new an editorWindow

??? node "Example"

    ``` cpp
        public class SaveEditorWindow : EditorWindow
    {
    private  SerializedObject serObj;

    private static SaveEditorWindow instance;

    [MenuItem("SaveEditor/editor window")]
    private static void ShowWindow() {
        instance=EditorWindow.GetWindow<SaveEditorWindow>();
        instance.Show();
    }

    //显示时调用
    private void OnEnable() {
        serObj = new SerializedObject(this);
        comSP = serObj.FindProperty("components");
        saveDP = serObj.FindProperty("SaveDuringPlay");
        EditorApplication.playModeStateChanged += OnChangePlayModeState;
        //Debug.Log("OnEnable");
    }

    //绘制窗体内容
    private void OnGUI() {
        EditorGUILayout.LabelField("Welcome using DemonViglu's SaveEditor", EditorStyles.boldLabel);
        serObj.Update();

        EditorGUILayout.PropertyField(comSP);
        EditorGUILayout.PropertyField(saveDP);
        serObj.ApplyModifiedProperties();
        if (GUILayout.Button("Save")) {
            Check();
        }
        if (!EditorApplication.isPlaying&&GUILayout.Button("Load")) {
            OnChangePlayModeState(PlayModeStateChange.ExitingPlayMode);
        }
    }

    //固定帧数调用
    private void Update() {

        if (SaveDuringPlay&&EditorApplication.isPlaying) {
            Check();
        }
    }

    //隐藏时调用
    private void OnDisable() {
        //Debug.Log("OnDisable");
    }

    //销毁时调用
    private void OnDestroy() {
        //Debug.Log("OnDestroy");
    }
    }
    ```

- 与拓展editor不同，`EditorWindow`并没有为我们预先生成一个`SerializedObject`实例，所以我们需要在`OnEnable`中调用方法`new SerializedObject(target);`

!!! note "Little Knowledge"
    1. 使用`if (GUILayout.Button("Save"))`来实现触发某个按钮的效果。
    2. `EditorApplication`中的事件和字段十分有用，诸如`isPlaying`，`playModeStateChanged(`<a href="#PlayModeStateChange">PlayModeStateChange</a>`)`。
    3. `OnEnable`函数会在打开&进入运行等切换状态时调用。与此同时，自己写的class在进入和退出playmode时，都会相应的初始化。所以在 _Editor_ 下通过拖拽引用的对象，会在进入playmode时丢失。

- <a id="PlayModeStateChange">PlayModeStateChange</a>: 一个枚举类型，诸如ExsitingEditorMode,EnterredPlayMode,ExsitingPlayMode,EnterredEtiorMode。所以会发现， `playModeStateChange` 会在点击play按钮后会被调用两次



