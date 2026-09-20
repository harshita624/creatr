import React,{useState,useEffect} from "react"
import { Button } from "./ui/button"
function TodoApp()
{
    const [todos,setTodos]=useState([])
    const [input,setInput]=useState("")
    const addTodo=()=>{
        if(!input.trim())return;
        setTodos([...todos,{id:Date.now(),text:input,done:false}])
        setInput("")
    }
    const toggleTodo=(id)=>{
        setTodos(todos.map(t=>t.id===id?{...t,done:!t.done}:t))
    }
    const deleteTodo=(id)=>{
        setTodos(todos.filter(t=>t.id!==id))
    }
    return(
        <div>
            <input value={input} onChange={e=>setInput(e.target.value)}/>
            <Button onClick={addTodo}>Add</Button>
            <ul>
                {todos.map(t=>(
                    <li key={t.id} style={{textDecoration:t.done?"line-through":"none"}}>
                 <span onClick={()=>toggleTodo(t.id)}>{t.text}</span>
                 <Button onClick={()=>deleteTodo(t.id)}>X</Button>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default TodoApp;


function Counter()
{
    const [count,setCount]=useState(0)

    return(
        <div>
            <h2>{count}</h2>
            <Button onClick={()=>setCount(c=>c+1)}>+</Button>
            <Button onClick={()=>setCount(c=>c-1)}></Button>
        </div>
    )
}



function LoginForm()
{
    const [form,setForm]=useState({email:"",password:""})
    const [error,setError]=useState("")

    const handleSubmit=async(e)=>{
        e.preventDefault()
        if(!form.email||!form.password)return setError("Fill required credentials")
        try{
        const res=await fetch("/api/login",{
            method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(form)
        })
        if(!res.ok)throw new Error("Invalid credentials")
            const data=await res.json()
        localStorage.setItem("token",data.token)
    }
    catch(err)
    {
        return setError(err.message)
    }
    }

    return(
        <form onSubmit={handleSubmit}>
         <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
         <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
         {error && <p style={{color:"red"}}>{error}</p>}
         <Button type="submit">Submit</Button>
        </form>
    )
}

function Register()
{
    const [form,setForm]=useState({name:"",email:"",password:"",confirm:""})
    const [errors,setErrors]=useState({name:"",email:"",password:"",confirm:""})
    const validate=()=>{
         const temp={name:"",email:"",password:"",confirm:""}
         if(!form.name)
                temp.name="Enter name"
          if(!form.email.includes("@"))
          {
            temp.email="Enter valid email"
          }
          if(form.password.length<6)
          {
            temp.password="Min 6 characters"
          }
          if(form.confirm!==form.password)
          {
            temp.confirm="Passwords should match"
          }
          return temp
    }
    const handleSubmit=(e)=>{
        e.preventDefault()
        const error=validate();
        setErrors(error)
        if(!error.confirm && !error.name &&!error.email && !error.password)
        {
            console.log("submitting",form)
        }
    }
    return(
        <form onSubmit={handleSubmit}>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
            <p style={{color:"red"}}>{errors.name}</p>
          <input type='email' value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
            <p style={{color:"red"}}>{errors.email}</p>
          <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
            <p style={{color:"red"}}>{errors.password}</p>
          <input type="password" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})}/>
            <p style={{color:"red"}}>{errors.confirm}</p>
          <Button type="submit">Submit</Button>
        </form>
    )
}

function Filter({items})
{
    const [query,setQuery]=useState("")
    const filtered=items.filter(i=>i.toLowerCase().includes(query.toLowerCase()))
    return(
        <div>
            <input value={query} onChange={e=>setQuery(e.target.value)}/>
            <ul>
                {filtered.map(i=><li key={i}>{i}</li>)}
            </ul>
        </div>
    )
}

function UserList()
{
    const [users,setUsers]=useState([])

    useEffect(()=>{
        async function getUsers()
        {
        const res=await fetch("https://jsonplaceholder.typicode.com/users")
        const data=res.json()
        setUsers(data)
        }
        getUsers()
    },[])
    return(
        <div>
            <h2>Users</h2>
            <ul>
                {users.map(user=><li key={user.id}>{user.name}</li>)}
            </ul>
        </div>
    )
}

function CrudTable()
{
    const [items,setItems]=useState([{id:1,name:"Item A"}])
    const [editId,setEditId]=useState(null)
    const [text,setText]=useState("")

    const addItem=()=>{
        setItems([...items,{id:Date.now(),name:"New Item"}])
    }
    const saveItem=()=>{
        setItems(items.map(item=>item.id===editId?{...item,name:text}:item))
        setEditId(null)
    }
    const deleteItem=(id)=>{
        setItems(items.filter(item=>item.id!==id))
    }
    const editItem=(item)=>{
        setEditId(item.id)
        setText(item.name)
    }

}

function Uncontrolled()
{
    const input=useRef()
    return(
        <div>
            <input ref={input} defaultValue=""/>
            <button onClick={()=>alert(input.current.value)}>Submit</button>
        </div>
    )
}
function Parent()
{
    const [value,setValue]=useState("")
    return(
        <div>
            <InputChild value={value} onChange={setValue}/>
            <DisplayChild value={value}/>
        </div>
    )
}
function InputChild({value,onChange})
{
    return(
        <div>
            <input value={value} onchange={e=>onChange(e.target.value)}/>
        </div>
    )
}
function DisplayChild({value})
{
    return(
        <div>
            <p>Your value:{value}</p>
        </div>
    )
}

function StarRating()
{
    const [rating,setRating]=useState(0)
    const [hover,setHover]=useState(0)

    return(
        <div>
            {[1,2,3,4,5].map((star)=>(
                <span key={star} onClick={()=>setRating(star)} onMouseEnter={()=>setHover(star)} onMouseLeave={()=>setHover(0)}
                style={{fontSize:"30px",color:star<=(hover||rating)?"gold":"gray", cursor:"pointer"}}>
                   *
                </span>
            ))}
            <br/>
            <button onClick={()=>setRating(0)}>Reset</button>
        </div>
    )
}

function Accordian({items}){
    const [open,setOpen]=useState(null)
    function handleClick(index){
        if(open===index)
        {
            setOpen(null)
        }
        else{
            setOpen(index)
        }
    }
    return(
        <div>
            {items.map((item,index)=>(
                <div key={index}>
                   <button onClick={()=>handleClick(index)}>
                     {item.title}
                   </button>
                   {open===index&&(<p>{item.content}</p>)}
                </div>
            ))}
        </div>
    )
}



function Modal({isOpen,onClose,title,children})
{
    useEffect(()=>{
        function handleKey(event)
        {
            if(event.key==="Escape")
            {
                onClose()
            }
        }
        window.addEventListener("keydown",handleKey)
        return()=>{
            window.removeEventListener("keydown",handleKey)
        }
    },[])
    if(!isOpen)
    {
        return null
    }
    return(
        <div onClick={onClose} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)"}}>
            <div onClick={(e)=>e.stopPropagation()} style={{position:"white",padding:"20px",width:"300px",margin:"100px auto"}}>
                <h2>{title}</h2>
                {children}
                <br/>
                <button onClick={onClose}>
                   Close
                </button>
            </div>

        </div>
    )
}

function Tabs({tabs}){
    const [active,isActive]=useState(0)
    return(
        <div>
            {tabs.map((tab,index)=>(
                <button key={index} onClick={()=>setActive(index)} style={{background:index===active?"blue":"gray"}}>{tab.label}</button>
            ))}
            <hr/>
            <p>
            {tabs[active].content}
            </p>
        </div>
    )
}


