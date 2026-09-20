import React,{useState} from "react"
const variants = [
    { color: "Red", size: "S", stock: 5, price: 50 },
    { color: "Red", size: "M", stock: 0, price: 50 },
    { color: "Blue", size: "M", stock: 3, price: 55 },
    { color: "Blue", size: "L", stock: 2, price: 55 }
];

function Change()
{
    const [color,setColor]=useState("red")
    const [size,setSize]=useState("S")
    const availableSizes=variants.filter(v=>v.color===color && v.stock>0).map(v=>v.size===size)
    const selected=variants.filter(v=>v.color===color && v.stock>0 && v.size===size)
    function changeColor(newcolor)
    {
        setColor(newcolor)
        const sizes=variants.filter(v=>v.color===newcolor && v.stock>0).map(v=>v.size===size)
        if(!sizes.includes(size))
        {
            if(sizes.length>0)
            {
                setSize(sizes[0])
            }
            else{
                setSize("")
            }
        }
    }
    return (
        <div>
            <h2>Color</h2>
            {["Red","Blue"].map(c=>(
                <button key={c} onClick={()=>changeColor(c)} >{c}</button>
            ))}
            <h2>Sizes</h2>

            {["XS","S","M","L","XL"].map(s=>{
                const available=availableSizes.includes(s)
                return (
                    <button key={s} onClick={()=>setSize(s)} disabled={!available} >{s}{!available && "Out of stock"} </button>
                )
})}

{selected?(
    <div>
    <p>{selected.price}</p>
    <p>{selected.stock}</p>
    </div>
):(<p>The combination is not available</p>)}
        </div>
    )
}