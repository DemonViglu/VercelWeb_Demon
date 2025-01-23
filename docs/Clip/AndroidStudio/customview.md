# 自定义视图 样板

=== "component.XML"
	``` xml
		<?xml version="1.0" encoding="utf-8"?>
		<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
		xmlns:app="http://schemas.android.com/apk/res-auto"
		xmlns:tools="http://schemas.android.com/tools"
		android:layout_width="match_parent"
		android:layout_height="138dp">
		<Button
			android:id="@+id/activity_teleport_btn"
			android:layout_width="wrap_content"
			android:layout_height="wrap_content"
			android:layout_marginEnd="16dp"
			android:text="Button"
			app:layout_constraintBottom_toBottomOf="parent"
			app:layout_constraintEnd_toEndOf="parent"
			app:layout_constraintTop_toTopOf="parent"
			app:layout_constraintVertical_bias="0.477" />
		<ImageView
			android:id="@+id/activity_teleport_imageview"
			android:layout_width="wrap_content"
			android:layout_height="wrap_content"
			android:layout_marginStart="16dp"
			app:layout_constraintBottom_toBottomOf="parent"
			app:layout_constraintStart_toStartOf="parent"
			app:layout_constraintTop_toTopOf="parent"
			app:layout_constraintVertical_bias="0.466"
			android:src="@drawable/ic_launcher_foreground" />
		<TextView
			android:id="@+id/activity_teleport_title_text"
			android:layout_width="wrap_content"
			android:layout_height="wrap_content"
			android:layout_marginStart="14dp"
			android:layout_marginTop="24dp"
			android:text="TextView"
			app:layout_constraintEnd_toEndOf="parent"
			app:layout_constraintHorizontal_bias="0.03"
			app:layout_constraintStart_toEndOf="@+id/activity_teleport_imageview"
			app:layout_constraintTop_toTopOf="parent" />
		<TextView
			android:id="@+id/activity_teleport_content_text"
			android:layout_width="138dp"
			android:layout_height="31dp"
			android:layout_marginStart="22dp"
			android:layout_marginBottom="44dp"
			android:text="TextView"
			app:layout_constraintBottom_toBottomOf="parent"
			app:layout_constraintEnd_toEndOf="parent"
			app:layout_constraintHorizontal_bias="0.0"
			app:layout_constraintStart_toEndOf="@+id/activity_teleport_imageview" />
		</androidx.constraintlayout.widget.ConstraintLayout>
	```


=== "component.kt"
	```cpp
		package com.demonviglu.demonapp.ui.component
		import android.content.Context
		import android.util.AttributeSet
		import android.view.LayoutInflater
		import android.widget.Button
		import android.widget.TextView
		import androidx.constraintlayout.widget.ConstraintLayout
		import com.demonviglu.demonapp.R
		class ActivityTeleport:ConstraintLayout {
		constructor(mcontext: Context):super(mcontext){
			initView(this.context)
		}
		constructor(mcontext: Context,mattri:AttributeSet):super(mcontext,mattri){
			initView(this.context)
		}
		constructor(mcontext: Context,mattri:AttributeSet,defStyAttri:Int):super(mcontext,mattri,defStyAttri){
			initView(this.context)
		}
		private fun initView(context: Context){
			val view = LayoutInflater.from(context).inflate(R.layout.component_activity_teleport_layout,this,true)
			btn = view.findViewById(R.id.activity_teleport_btn)
			titleText = view.findViewById(R.id.activity_teleport_title_text)
			contentText = view.findViewById(R.id.activity_teleport_content_text)
			awake()
		}
		lateinit var btn_on_click_listener : ()->Unit
		lateinit var btn:Button
		lateinit var titleText:TextView
		lateinit var contentText:TextView
		public fun setOnButtonClickListener(callback:()->Unit){
			btn_on_click_listener = callback;
		}
		public fun setTitleText(s:String){
			titleText.text = s
		}
		public fun setContentText(s:String){
			contentText.text = s
		}
		public fun setButtonText(s:String){
			btn.text = s
		}
		private fun awake(){
			btn.setOnClickListener{
				btn_on_click_listener.invoke()
			}
		}
		}
	```


=== "activity.kt"
	``` kt
		val ly : LinearLayout = findViewById(R.id.activity_teleport_listview)
        for(i in 0..5){
            val at = ActivityTeleport(this)
            at.setTitleText(i.toString())
            at.setOnButtonClickListener {
                Toast.makeText(this,"Hello",Toast.LENGTH_SHORT).show()
            }
            ly.addView(at)
        }
	```