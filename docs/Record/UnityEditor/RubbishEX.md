# EMMM

=== "DemonConsole"

    ``` c#
        using System;
        using UnityEditor;
        using UnityEngine;
        using UnityEngine.UIElements;


        public class DemonDebugConsole : EditorWindow
        {
            private SerializedObject serObj;

            private static DemonDebugConsole instance;

            float currentScrollViewHeight;
            bool resize = false;
            Rect cursorChangeRect;

            VisualElement visualElement;
            ListView listView;
            DemonDebugMessageBox currentBox = null;

            private bool showStack = false;
            [MenuItem("Tools/DemonTool/DebugConsole")]
            private static void ShowWindow() {
                instance = EditorWindow.GetWindow<DemonDebugConsole>();
                instance.Show();
            }

            public void OnEnable() {
                DemonDebug.OnLog += GetLogCall;
                currentScrollViewHeight = this.position.height*0.55f;
                cursorChangeRect = new Rect(0, currentScrollViewHeight+30, this.position.width, 2f);

                //SetLogsBox();
            }

            public void GetLogCall(DemonDebugMessageBox messageBox) {
                switch(messageBox.type) {
                    case LogType.Normal:
                        break;
                    case LogType.Error:
                        break;
                    case LogType.Warning:
                        break;
                    default:
                        break;
                }
                Repaint();
                //ListViewUpdate();
                logScrollViewPosition.y = 50 * DemonDebug.Logs.Count - currentScrollViewHeight+80;
            }


            Vector2 logScrollViewPosition;
            Vector2 toggleScrollViewPosition;
            public void OnGUI() {
                ///Tool Button
                GUILayout.BeginHorizontal();
                if( GUILayout.Button("Clear Logs",GUILayout.Width(100)) ) {
                    DemonDebug.CleanUP();
                    //listView.Rebuild();
                }
                showStack = GUILayout.Toggle(showStack,"Show Stack", GUILayout.Width(100));
                GUILayout.EndHorizontal();
                GUI.DrawTexture(new Rect(0, 20, position.width,0.5f), EditorGUIUtility.whiteTexture);
                //MessageBox
                GUILayout.BeginVertical();


                //ShowSelectLogs();

                GUILayout.BeginHorizontal();


                toggleScrollViewPosition=GUILayout.BeginScrollView(toggleScrollViewPosition,GUILayout.Height(currentScrollViewHeight),GUILayout.Width(100));
                foreach(var tag in DemonDebug.Tags) {
                    DemonDebug.TagsMap[tag] = GUILayout.Toggle(DemonDebug.TagsMap[tag], tag);
                }
                GUILayout.EndScrollView();

                GUI.DrawTexture(new Rect(100,20,1,currentScrollViewHeight+10), EditorGUIUtility.whiteTexture);

                logScrollViewPosition = GUILayout.BeginScrollView(logScrollViewPosition, GUILayout.Height(currentScrollViewHeight),GUILayout.Width(position.width-100));
                GUIStyle boxStyle = new GUIStyle();
                boxStyle.alignment = TextAnchor.UpperLeft;
                boxStyle.normal.textColor = Color.white;
                boxStyle.wordWrap = true;
                boxStyle.normal.background = MakeTex(1, 1, Color.grey);
                foreach (var a in DemonDebug.Logs) {
                    switch (a.type) {
                        case LogType.Normal:
                            boxStyle.normal.textColor = Color.white;
                            break;
                        case LogType.Error:
                            boxStyle.normal.textColor = Color.red; break;
                        case LogType.Warning:
                            boxStyle.normal.textColor= Color.yellow;
                            break;
                    
                    }
                    bool show = true;
                    if (a.tags != null) {
                        foreach (var tag in a.tags) {
                            if (!DemonDebug.TagsMap[tag]) {
                                show = false; break;
                            }
                        }
                    }
                    if (show) {
                        string tmp = a._time + '\n' + a.owner + ":" + a.message;
                        if (showStack) tmp = tmp + "\n" + a.stackTrace;
                        GUILayout.Box(tmp, boxStyle, GUILayout.Width(position.width - 100));
                        GUILayout.Space(20);
                    }
                    }
                    GUILayout.EndScrollView();


                GUILayout.EndHorizontal ();

                cursorChangeRect.Set(cursorChangeRect.x, currentScrollViewHeight + 30, position.width, cursorChangeRect.height);
                ResizeScrollView();

                GUILayout.FlexibleSpace();

                if(currentBox!=null) {
                    EditorGUILayout.LabelField(currentBox._time + '\n' + currentBox.owner + ":" + currentBox.message, GUILayout.Height(position.height - currentScrollViewHeight - 30));
                }


                GUILayout.EndVertical();
            }

            private void SetLogsBox() {
                // The "makeItem" function will be called as needed
                // when the ListView needs more items to render
                Func<VisualElement> makeItem = () => new Label();

                // As the user scrolls through the list, the ListView object
                // will recycle elements created by the "makeItem"
                // and invoke the "bindItem" callback to associate
                // the element with the matching data item (specified as an index in the list)
                Action<VisualElement, int> bindItem = (e, i) => (e as Label).text = DemonDebug.Logs[i]._time + '\n' + DemonDebug.Logs[i].owner + ":" + DemonDebug.Logs[i].message;
                listView = new ListView();
                listView.makeItem = makeItem;
                listView.bindItem = bindItem;
                listView.itemsSource = DemonDebug.Logs;

                // Callback invoked when the user double clicks an item
                //listView.onItemsChosen += Debug.Log;

                // Callback invoked when the user changes the selection inside the ListView
                //listView.onSelectionChange += ShowSelectLogs;
                visualElement = new VisualElement();
                rootVisualElement.Add(visualElement);
                visualElement.style.position = Position.Relative;
                visualElement.style.top = 30;
                visualElement.style.left = 10;
                visualElement.Add(listView);
            }

            private void ListViewUpdate() {
                listView.Rebuild();
                listView.ScrollToItem(listView.childCount - 1);
            }

            private void ShowSelectLogs() {
                currentBox =listView.selectedItem as DemonDebugMessageBox;
            }
            private void ResizeScrollView() {
                GUI.DrawTexture(cursorChangeRect, EditorGUIUtility.whiteTexture);
                EditorGUIUtility.AddCursorRect(cursorChangeRect, MouseCursor.ResizeVertical);
                //visualElement.style.height = currentScrollViewHeight;
                if (Event.current.type == EventType.MouseDown && cursorChangeRect.Contains(Event.current.mousePosition)) {
                    resize = true;
                }
                if (resize) {
                    currentScrollViewHeight = Event.current.mousePosition.y-30;
                }
                if (Event.current.type == EventType.MouseUp)
                    resize = false;
            }
            private Texture2D MakeTex(int width, int height, Color col) {
                Color[] pix = new Color[width * height];
                for (int i = 0; i < pix.Length; ++i) {
                    pix[i] = col;
                }
                Texture2D result = new Texture2D(width, height);
                result.SetPixels(pix);
                result.Apply();
                return result;
            }

        }

    ```

=== "Json2SO"

    ``` c#
        using System.Collections.Generic;
        using UnityEditor;
        using UnityEngine;

        public class Json2SOEditor : EditorWindow
        {
            private SerializedObject serObj;

            private static Json2SOEditor instance;

            [MenuItem("Tools/DemonTool/Json2SOEditor")]
            private static void ShowWindow() {
                instance = EditorWindow.GetWindow<Json2SOEditor>();
                instance.Show();
            }
            public void OnEnable() {
                serObj=new SerializedObject(this);
                path=serObj.FindProperty("jsonDataPath");
                transitionTypeSP = serObj.FindProperty("transitionType");
                bagItems=new List<BagItemSO> ();
                bagItemsSP = serObj.FindProperty("bagItems");
            }
            public void OnGUI() {
                serObj.Update();
                EditorGUILayout.LabelField("Welcome using DemonViglu's JsonTool",EditorStyles.boldLabel);
                EditorGUILayout.PropertyField(path);
                EditorGUILayout.PropertyField (transitionTypeSP);
                serObj.ApplyModifiedProperties();
                if (GUILayout.Button("CreateSO")) {
                    CreateSO();
                }

                if(bagItems.Count > 0) {
                    EditorGUILayout.LabelField("This is the so Instantiated(Rewrite) just now.", EditorStyles.boldLabel);
                    EditorGUILayout.PropertyField(bagItemsSP);
                }
            }

            #region Parameter
            public string jsonDataPath= "Assets/DemoViglu/Resources/LubanConfig/tbitem.json";
            private SerializedProperty path;

            public TransitionType transitionType;
            private SerializedProperty transitionTypeSP;

            private string outputFolderPath;

            public List<BagItemSO> bagItems;
            private SerializedProperty bagItemsSP;
            #endregion

            public void CreateSO() {
                switch(transitionType) {
                    case TransitionType.BagItemSO:
                        //PreDuce with the json file;
                        TextAsset jsonAsset=(TextAsset)AssetDatabase.LoadAssetAtPath(jsonDataPath, typeof(TextAsset));
                        string tmp = "{ \"item\" :" + jsonAsset.text + "}";
                        BagItemDataList bagItemDataList=JsonUtility.FromJson<BagItemDataList>(tmp);
                        Dictionary<string, BagItemData> dic = new Dictionary<string, BagItemData>();

                        //Due with the json file to dictionary
                        foreach(var  bagItem in bagItemDataList.item) {
                            if (!dic.ContainsKey(bagItem.itemFileName)) {
                                dic.Add(bagItem.itemFileName, bagItem);
                            }
                        }

                        //BeginToInstantiate
                        foreach (var bagItem in bagItemDataList.item) {
                            //The so path is upto the itemType
                            switch (bagItem.itemType) {
                                case 2:
                                    CreateBagItem_Comsumption(bagItem);
                                    break;
                                case 3:
                                    CreateBagItem_Bullet(bagItem);
                                    break;
                                case 6:
                                    CreateBagItem_Equip(bagItem);
                                    break;
                                default:
                                    CreateBagItem_Normal(bagItem);
                                    break;
                            }
                        }

                        break;
                }
            }
            private void CreateBagItem_Comsumption(BagItemData bagItem) {
                bool shouldCreate = false;
                BagItemData data;

                outputFolderPath = "Assets/GameData/LootItem/ItemSO/UsableItem";

                BagItemSO equipso = (BagItemSO)AssetDatabase.LoadAssetAtPath(outputFolderPath + "/" + bagItem.itemFileName + ".asset", typeof(BagItemSO));
                // Write your definition here
                if (equipso == null) {
                    equipso = ScriptableObject.CreateInstance<BagItemSO>();
                    shouldCreate = true;
                }
                data = bagItem;

                equipso.Item_id = data.itemId;
                equipso.nameString = data.itemName;
                equipso.itemType = data.itemType;
                equipso.itemValue = data.itemValue;
                equipso.maxDura = data.maxDura;
                equipso.curDura = data.curDura;
                equipso.canUse = data.useable;
                equipso.width = data.itemWidth; equipso.height = data.itemHeight;
                equipso.itemDes = data.itemDes;
                equipso.itemLevel = data.itemLevel;
                equipso.useFoodValue = data.useFoodValue;
                equipso.useHealthValue = data.useHealthValue;
                equipso.useWaterValue = data.useWaterValue;
                //

                if (shouldCreate) {
                    AssetDatabase.CreateAsset(equipso, outputFolderPath + "/" + data.itemFileName + ".asset");
                    AssetDatabase.SaveAssets();
                    AssetDatabase.Refresh();
                    Debug.Log(data.itemFileName + " has been created.");
                }
                else {
                    EditorUtility.SetDirty(equipso);
                    Debug.Log(data.itemFileName + " has been rewrited.");
                }
                bagItems.Add(equipso);

            }

            private void CreateBagItem_Bullet(BagItemData bagItem) {
                bool shouldCreate = false;
                BagItemData data;

                outputFolderPath = "Assets/GameData/LootItem/ItemSO/BulletItem";

                BulletItemSO equipso = (BulletItemSO)AssetDatabase.LoadAssetAtPath(outputFolderPath + "/" + bagItem.itemFileName + ".asset", typeof(BagItemSO));
                // Write your definition here
                if (equipso == null) {
                    equipso = ScriptableObject.CreateInstance<BulletItemSO>();
                    shouldCreate = true;
                }
                data = bagItem;

                equipso.Item_id = data.itemId;
                equipso.nameString = data.itemName;
                equipso.itemType = data.itemType;
                equipso.itemValue = data.itemValue;
                equipso.maxDura = data.maxDura;
                equipso.curDura = data.curDura;
                equipso.canUse = data.useable;
                equipso.width = data.itemWidth; equipso.height = data.itemHeight;
                equipso.itemDes = data.itemDes;
                equipso.itemLevel = data.itemLevel;
                //

                if (shouldCreate) {
                    AssetDatabase.CreateAsset(equipso, outputFolderPath + "/" + data.itemFileName + ".asset");
                    AssetDatabase.SaveAssets();
                    AssetDatabase.Refresh();
                    Debug.Log(data.itemFileName + " has been created.");
                }
                else {
                    EditorUtility.SetDirty(equipso);
                    Debug.Log(data.itemFileName + " has been rewrited.");
                }
                bagItems.Add(equipso);
            }

            private void CreateBagItem_Equip(BagItemData bagItem) {
                bool shouldCreate = false;
                BagItemData data;

                outputFolderPath = "Assets/GameData/LootItem/ItemSO/EquipItem";

                EquipItemSO equipso = (EquipItemSO)AssetDatabase.LoadAssetAtPath(outputFolderPath + "/" + bagItem.itemFileName + ".asset", typeof(BagItemSO));
                // Write your definition here
                if (equipso == null) {
                    equipso = ScriptableObject.CreateInstance<EquipItemSO>();
                    shouldCreate = true;
                }
                data = bagItem;

                equipso.Item_id = data.itemId;
                equipso.nameString = data.itemName;
                equipso.itemType = data.itemType;
                equipso.itemValue = data.itemValue;
                equipso.maxDura = data.maxDura;
                equipso.curDura = data.curDura;
                equipso.canUse = data.useable;
                equipso.width = data.itemWidth; equipso.height = data.itemHeight;
                equipso.itemDes = data.itemDes;
                equipso.itemLevel = data.itemLevel;
                //

                if (shouldCreate) {
                    AssetDatabase.CreateAsset(equipso, outputFolderPath + "/" + data.itemFileName + ".asset");
                    AssetDatabase.SaveAssets();
                    AssetDatabase.Refresh();
                    Debug.Log(data.itemFileName + " has been created.");
                }
                else {
                    EditorUtility.SetDirty(equipso);
                    Debug.Log(data.itemFileName + " has been rewrited.");
                }
                bagItems.Add(equipso);
            }

            private void CreateBagItem_Normal(BagItemData bagItem) {
                bool shouldCreate = false;
                BagItemData data;
                outputFolderPath = "Assets/GameData/LootItem/ItemSO/DefaultItem";

                BagItemSO so = (BagItemSO)AssetDatabase.LoadAssetAtPath(outputFolderPath + "/" + bagItem.itemFileName + ".asset", typeof(BagItemSO));
                // Write your definition here
                if (so == null) {
                    so = ScriptableObject.CreateInstance<BagItemSO>();
                    shouldCreate = true;
                }
                data = bagItem;

                so.Item_id = data.itemId;
                so.nameString = data.itemName;
                so.itemType = data.itemType;
                so.itemValue = data.itemValue;
                so.maxDura = data.maxDura;
                so.curDura = data.curDura;
                so.canUse = data.useable;
                so.width = data.itemWidth; so.height = data.itemHeight;
                so.itemDes = data.itemDes;
                so.itemLevel = data.itemLevel;
                //

                if (shouldCreate) {
                    AssetDatabase.CreateAsset(so, outputFolderPath + "/" + data.itemFileName + ".asset");
                    AssetDatabase.SaveAssets();
                    AssetDatabase.Refresh();
                    Debug.Log(data.itemFileName + " has been created.");
                }
                else {
                    EditorUtility.SetDirty(so);
                    Debug.Log(data.itemFileName + " has been rewrited.");
                }
                bagItems.Add(so);
            }
        }

    ```