import React,{useState} from "react"

function Toggle({tabs})
{
    const [active,setActive]=useState(0)

    return (
        <div>
            {tabs.map((tab,index)=>(
                <div key={index}>
                <button key={index} onClick={()=>setActive(index)} >{tab.title}</button>
                <p>{tab.content}</p>
                </div>
            ))}
        </div>
    )
}