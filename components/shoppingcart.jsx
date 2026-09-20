/*import React,{useState,useRef} from "react"

function OptimisticCart()
{
    const [cart,setCart]=useState([
        {
            id:1,
            name:"Headphones",
            qty:2,
            price:500
        },
        {
            id:2,
            name:"Laptop",
            qty:4,
            price:600
        }
    ])
    const [loading,setLoading]=useState((false))
    const [error,setError]=useState("")
    const timer=useRef(null)

    function updateCart(id,value)
    {
        const old=[...cart]
        setError("")
        const newcart=cart.map((item)=>{
            if(item.id===id)
            {
                return {...item,qty:item.qty+value}
            }
            return item
        }).filter(item=>item.qty>0)
        setCart(newcart)
        setError("")
        if(timer.current)
        {
            clearTimeout(timer.current)
        }
     timer.current=setTimeout(async()=>{
        setLoading(true)
        try{
            await new Promise((reject,resolve)=>{
                if(Math.random()>0.8)
                {
                    reject()
                }
                else{
                    resolve()
                }
            },500)
        }
        catch(err)
        {
            setCart(old)
            setError("Update failed")
        }
     },500)
     setLoading(false)
    }
    const total=0;
    for(let item of cart)
    {
        total+=item.qty*item.price
    }
    return(
        <div>

            {cart.map(item=>(
                <div key={item.id}>
                    <p>{item.name}</p>
                    <p>{item.price}</p>
                    <button onClick={()=>updateCart(item.id,1)}>+</button>
                    <button onClick={()=>onClick(item,-1)}>-</button>
                </div>
            ))}
            <p>{total}</p>
            {loading && <p>Loading...</p>}
            {
                error && <p>{error}</p>
            }
        </div>
    )

}*/


import { update } from "@/convex/posts"
import React,{useState,useRef} from "react"

function Cart()
{
    const [cart,setCart]=useState([{
        "id":1,
        "qty":500,
        "type":laptop
    }])
    const [loading,setLoading]=useState(false)
    const [error,setError]=useState("")
    const timer=useRef(null)
    function change(id,value)
    {
        const old=[...cart]
        const newcart=cart.map(item=>{
            if(item.id===id)
            {
                return {...cart,qty:item.qty+value}
            }
            return item
        }).filter(item=>item.qty>0)
        setCart(newcart)


        if(timer.current)
        {
            clearTimeout(timer.current)
        }
        timer.current=setTimeout(async()=>{
            setLoading(true)
            try{
            await new Promise((reject,resolve)=>{
                if(Math.random>0.8)
                {
                    reject()
                }
                else{
                    resolve()
                }
            })
        }catch(err)
        {
               setError(err)
               setLoading(false)
        }
        },3000)
    
    }
    const total=0;
    for(let item of cart)
    {
        total+=item.qty*item.price
    }
    return (
        <div>
            {cart.map(item=>{
                <div key={item.id} >
                <button onClick={()=>update(item.id,1)} >+</button>
                <button onClick={()=>update(item.id,-1)} >-</button>
                </div>
            })}
        </div>
    )
}