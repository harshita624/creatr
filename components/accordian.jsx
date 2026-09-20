import React,{useState} from "react"

function Toggle({items})
{
    const [openindex,setOpenIndex]=useState(null)

    function open(index)
    {
        if(index===openindex)
        {
            setOpenIndex(null)
        }
        else{
            setOpenIndex(index)
        }
    }
    return (
        <div>
             {items.map((item,id)=>(
                <div key={id}>
                   <button onClick={()=>open(id)}>
                    {item.title}
                    {openindex===id?"up":"down"}
                   </button>
                   {openindex===id && <p>{item.content}</p>}
                </div>
             ))}
        </div>
    )
}