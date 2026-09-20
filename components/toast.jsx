import React,{useState} from "react"

function Toasts()
{
    const [toasts,setToasts]=useState([])
    function addToast(message,type)
    {
        const id=Date.now()
        setToasts(prev=>[
            ...prev,
            {
                "id":id,
                "message":message,
                "type":type,
            }
        ])
        setTimeout(()=>{
                setToasts(prev=>(prev.filter(toast=>toast.id!==id)))
        },3000)

    }
    function deleteToast(id)
    {
        setToasts(prev=>(prev.filter(toast=>toast.id!==id)))
    }
    return (
        <div>
            <button onClick={()=>addToast("Suceesfully ","success")}>Success</button>
            <button onClick={()=>setToasts()}>Error</button>
            <div>
                {toasts.map(toast=>{
                   <div key={toast.id}>
                    <p>{toast.message}</p>
                   </div>
                })}
                <button onClick={()=>deleteToast(toast.id)}></button>
            </div>
        </div>
    )
}